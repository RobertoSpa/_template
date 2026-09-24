import { type FileGroup, KINDS, type Policy, type Route } from './shared.ts'
import assert from 'node:assert'

export type PackageManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  sideEffects?: boolean | string[]
}
// Each value is the String() of the resolved Vite option.
export type ResolvedVite = Record<
  | 'assetsInlineLimit'
  | 'manifest'
  | 'modulePreloadPolyfill'
  | 'onLog'
  | 'sourcemap'
  | 'target',
  string
>

const BUNDLE_STEP = /run:\s*pnpm bundle\S*/gu
const EXACT_STEP = /run:\s*pnpm bundle\s*$/mu
const PERCENT = 100
const RECORDS_MAX = 1_000
// Each gate of pnpm bundle. write is a command, and not a gate.
const GATE_NAMES = ['policy', 'size']

export const bytesOf = (policy: Policy): Array<[string, number]> => {
  assert(policy.routes.length > 0)
  assert(Object.keys(policy.files).length > 0)

  const entries: Array<[string, number]> = [
    ['build.inline_max_bytes', policy.build.inline_max_bytes],
    ['growth.branch_max_bytes', policy.growth.branch_max_bytes],
    ['stage.slack_bytes', policy.stage.slack_bytes],
    ...KINDS.map((kind): [string, number] => [
      `ceiling.${kind}`,
      policy.ceiling[kind],
    ]),
    ...Object.entries(policy.files).flatMap(
      ([name, group]): Array<[string, number]> => [
        [`files.${name}.max_wire`, group.max_wire],
        [`files.${name}.max_raw`, group.max_raw],
      ],
    ),
    ...policy.routes.flatMap((route) =>
      KINDS.map((kind): [string, number] => [
        `routes ${route.path} budget.${kind}`,
        route.budget[kind],
      ]),
    ),
  ]

  assert(entries.length > KINDS.length)

  return entries
}

export const integerProblems = (policy: Policy): string[] => {
  const entries = bytesOf(policy)

  assert(entries.length > 0)

  const problems = entries
    .filter(([, value]) => !Number.isInteger(value) || value < 0)
    .map(
      ([key, value]) =>
        `${key} is ${value}, and not an integer of bytes. Rule BYTE-03.`,
    )

  assert(problems.length <= entries.length)

  return problems
}

export const extensionProblems = (
  files: Record<string, FileGroup>,
): string[] => {
  assert(Object.keys(files).length > 0)

  const all = Object.values(files).flatMap((group) => group.extensions)
  const twice = [...new Set(all)].filter(
    (extension) => all.indexOf(extension) !== all.lastIndexOf(extension),
  )

  assert(twice.length <= all.length)

  return twice.map(
    (extension) =>
      `the extension ${extension} is in two groups of files. Rule BYTE-02.`,
  )
}

export const manifestProblems = (
  manifest: PackageManifest,
  policy: Policy,
): string[] => {
  assert(Array.isArray(policy.packages.denied))
  assert(policy.shake.side_effects.length > 0)

  const versions = { ...manifest.devDependencies, ...manifest.dependencies }
  const problems = Object.keys(versions)
    .filter((name) => policy.packages.denied.includes(name))
    .map((name) => `${name} is in packages.denied. Rule PKG-02.`)

  const wanted = JSON.stringify(policy.shake.side_effects)
  const found = JSON.stringify(manifest.sideEffects)

  if (found !== wanted) {
    problems.push(
      `sideEffects of package.json is ${found}, and shake.side_effects is ${wanted}. Rule SHAKE-01.`,
    )
  }

  return problems
}

const recordProblems = (route: Route, stage: Policy['stage']): string[] => {
  assert(route.path.length > 0)
  assert(stage.order.length > 0)

  const problems: string[] = []

  if (route.owner.length === 0) {
    problems.push(`${route.path} has no owner. Rule STG-02.`)
  }

  if (!stage.order.includes(route.stage)) {
    problems.push(
      `${route.path} has the stage ${route.stage}, which is not in stage.order. Rule STG-02.`,
    )
  }

  return problems
}

const marginProblems = (route: Route, policy: Policy): string[] => {
  const percent = policy.stage.margin[route.stage]

  assert(route.path.length > 0)

  if (percent === undefined) {
    return []
  }

  assert(Number.isInteger(percent))

  return KINDS.flatMap((kind) => {
    // The division rounds down, so the budget never goes past the margin.
    const permitted = Math.floor(
      (policy.ceiling[kind] * (PERCENT - percent)) / PERCENT,
    )

    return route.budget[kind] > permitted
      ? [
          `${route.path} has a ${kind} budget of ${route.budget[kind]}. The stage ${route.stage} permits ${permitted}. Rule STG-04.`,
        ]
      : []
  })
}

export const routeRecordProblems = (
  policy: Policy,
  pages: string[],
  resiliencePaths: string[],
): string[] => {
  assert(policy.routes.length > 0)
  assert(pages.length <= RECORDS_MAX)

  const paths = policy.routes.map((route) => route.path)
  const pageRecords = new Set(policy.routes.map((route) => route.page))
  const problems = [
    ...pages
      .filter((page) => !pageRecords.has(page))
      .map((page) => `src/pages/${page} has no record in routes. Rule STG-01.`),
    ...resiliencePaths
      .filter((path) => !paths.includes(path))
      .map(
        (path) =>
          `${path} of resilience/routes.yaml has no record in routes. Rule STG-01.`,
      ),
    ...paths
      .filter((path, index) => paths.indexOf(path) !== index)
      .map((path) => `${path} has two records in routes. Rule STG-02.`),
  ]

  for (const route of policy.routes) {
    problems.push(
      ...recordProblems(route, policy.stage),
      ...marginProblems(route, policy),
    )
  }

  return problems
}

export const viteProblems = (
  resolved: ResolvedVite,
  policy: Policy,
): string[] => {
  assert(policy.build.target.length > 0)
  assert(resolved.onLog.length > 0)

  const wanted: Array<[keyof ResolvedVite, string, string]> = [
    ['assetsInlineLimit', String(policy.build.inline_max_bytes), 'BSOT-01'],
    ['manifest', 'true', 'BSOT-01'],
    ['modulePreloadPolyfill', 'false', 'BLD-05'],
    ['onLog', 'true', 'BSOT-01'],
    ['sourcemap', policy.build.sourcemap, 'BSOT-01'],
    ['target', policy.build.target, 'BSOT-01'],
  ]

  return wanted
    .filter(([key, value]) => resolved[key] !== value)
    .map(
      ([key, value, rule]) =>
        `vite.config.ts gives build.${key} ${resolved[key]}, and the policy gives ${value}. Rule ${rule}.`,
    )
}

export const gateProblems = (gates: string[]): string[] => {
  assert(Array.isArray(gates))
  assert(GATE_NAMES.length > 0)

  return [
    ...GATE_NAMES.filter((name) => !gates.includes(name)).map(
      (name) => `gates has no ${name}. Rule BSOT-02.`,
    ),
    ...gates
      .filter((name) => !GATE_NAMES.includes(name))
      .map((name) => `gates holds ${name}, which is not a gate. Rule BSOT-02.`),
  ]
}

export const workflowProblems = (text: string): string[] => {
  assert(text.length > 0)

  const steps = [...text.matchAll(BUNDLE_STEP)].length
  const problems: string[] = []

  if (steps !== 1) {
    problems.push(
      `the bundle workflow has ${steps} bundle steps, and it must have 1. Rule BSOT-02.`,
    )
  } else if (!EXACT_STEP.test(text)) {
    problems.push(
      'the bundle step of the workflow is not exactly `pnpm bundle`. Rule BSOT-02.',
    )
  }

  if (text.includes('continue-on-error')) {
    problems.push('the bundle workflow holds continue-on-error. Rule FAIL-02.')
  }

  return problems
}
