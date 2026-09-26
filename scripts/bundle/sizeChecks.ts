import { deviates, type Deviation } from '../deviations.ts'
import {
  type Budget,
  type Count,
  type FileGroup,
  KINDS,
  type Policy,
  type Route,
  type Sizes,
} from './shared.ts'
import assert from 'node:assert'

const FILES_MAX = 10_000

export const budgetOf = (
  names: string[],
  loadedNames: string[],
  files: Record<string, Count>,
): Budget => {
  assert(names.every((name) => loadedNames.includes(name)))
  assert(loadedNames.every((name) => files[name] !== undefined))

  const budget = { css: 0, js: 0, loaded: 0, total: 0 }

  for (const name of loadedNames) {
    budget.loaded += files[name].wire
  }

  for (const name of names) {
    const { wire } = files[name]

    budget.total += wire

    if (name.endsWith('.js')) {
      budget.js += wire
    } else if (name.endsWith('.css')) {
      budget.css += wire
    }
  }

  assert(budget.total >= budget.js + budget.css)
  assert(budget.loaded >= budget.total)

  return budget
}

export const totalOf = (files: Record<string, Count>): Count => {
  assert(Object.keys(files).length <= FILES_MAX)

  const total = { raw: 0, wire: 0 }

  for (const count of Object.values(files)) {
    total.raw += count.raw
    total.wire += count.wire
  }

  assert(total.raw >= 0)

  return total
}

const fileProblems = (
  name: string,
  count: Count,
  group: string,
  limits: FileGroup,
): string[] => {
  assert(count.raw >= 0)
  assert(count.wire >= 0)
  assert(limits.rule.startsWith('BUD-'))

  const { rule } = limits
  const problems: string[] = []

  if (count.wire > limits.max_wire) {
    problems.push(
      `${name} has ${count.wire} wire bytes, and files.${group}.max_wire is ${limits.max_wire}. Rule ${rule}.`,
    )
  }

  if (count.raw > limits.max_raw) {
    problems.push(
      `${name} has ${count.raw} raw bytes, and files.${group}.max_raw is ${limits.max_raw}. Rule ${rule}.`,
    )
  }

  return problems
}

export const fileLimitProblems = (
  files: Record<string, Count>,
  groupOf: Record<string, string>,
  groups: Record<string, FileGroup>,
  deviations: Deviation[],
): string[] => {
  assert(Object.keys(files).length <= FILES_MAX)
  assert(Object.keys(groups).length > 0)

  return Object.entries(files).flatMap(([name, count]) => {
    const group = groupOf[name]

    assert(groups[group] !== undefined, `${name} has no group`)

    return deviates(deviations, groups[group].rule, name)
      ? []
      : fileProblems(name, count, group, groups[group])
  })
}

const ceilingProblems = (path: string, used: Budget, ceiling: Budget) => {
  assert(path.length > 0)
  assert(ceiling.total > 0)

  return KINDS.filter((kind) => used[kind] > ceiling[kind]).map(
    (kind) =>
      `${path} has ${used[kind]} ${kind} wire bytes, and ceiling.${kind} is ${ceiling[kind]}. Rule BUD-01.`,
  )
}

const budgetProblems = (
  route: Route,
  used: Budget,
  deviations: Deviation[],
) => {
  assert(route.path.length > 0)
  assert(used.total >= 0)

  if (deviates(deviations, 'BUD-02', route.path)) {
    return []
  }

  return KINDS.filter((kind) => used[kind] > route.budget[kind]).map(
    (kind) =>
      `${route.path} has ${used[kind]} ${kind} wire bytes, and its budget is ${route.budget[kind]}. Rule BUD-02.`,
  )
}

const lockProblems = (
  route: Route,
  used: Budget,
  stage: Policy['stage'],
): string[] => {
  assert(stage.order.includes(route.stage))
  assert(stage.order.includes(stage.lock_from))

  const locked =
    stage.order.indexOf(route.stage) >= stage.order.indexOf(stage.lock_from)

  if (!locked) {
    return []
  }

  return KINDS.filter(
    (kind) => route.budget[kind] - used[kind] > stage.slack_bytes,
  ).map(
    (kind) =>
      `${route.path} uses ${used[kind]} of a ${kind} budget of ${route.budget[kind]}. The free space is more than stage.slack_bytes ${stage.slack_bytes}. Run pnpm bundle:write. Rule BUD-03.`,
  )
}

export const routeProblems = (
  measured: Record<string, Budget>,
  policy: Pick<Policy, 'ceiling' | 'routes' | 'stage'>,
  deviations: Deviation[],
): string[] => {
  const { ceiling, routes, stage } = policy

  assert(routes.length > 0)
  assert(stage.slack_bytes >= 0)

  return routes.flatMap((route) => {
    const used = measured[route.path]

    if (used === undefined) {
      return [
        `the build gives no size for the route ${route.path}. Rule FAIL-01.`,
      ]
    }

    return [
      ...ceilingProblems(route.path, used, ceiling),
      ...budgetProblems(route, used, deviations),
      ...lockProblems(route, used, stage),
    ]
  })
}

export const growthProblems = (
  now: Sizes,
  base: Sizes,
  branchMaxBytes: number,
  deviations: Deviation[],
): string[] => {
  assert(branchMaxBytes >= 0)
  assert(now.total.wire >= 0)

  const added = now.total.wire - base.total.wire
  const problems: string[] = []
  const spent = deviations.some((record) => record.rule === 'BUD-02')

  if (
    added > branchMaxBytes &&
    !deviates(deviations, 'GROW-01', 'growth.branch_max_bytes')
  ) {
    problems.push(
      `the branch adds ${added} wire bytes to main, and growth.branch_max_bytes is ${branchMaxBytes}. Rule GROW-01.`,
    )
  }

  if (added > 0 && spent) {
    problems.push(
      `the branch adds ${added} wire bytes while a BUD-02 record is live. Rule GROW-02.`,
    )
  }

  return problems
}

const sortedOf = <T>(record: Record<string, T>): Record<string, T> => {
  assert(Object.keys(record).length <= FILES_MAX)

  const sorted = Object.fromEntries(
    Object.entries(record).toSorted(([a], [b]) => (a < b ? -1 : 1)),
  )

  assert(Object.keys(sorted).length === Object.keys(record).length)

  return sorted
}

export const sizesTextOf = (sizes: Sizes): string => {
  assert(sizes.total.wire >= 0)

  const text = `${JSON.stringify(
    {
      files: sortedOf(sizes.files),
      packages: sortedOf(sizes.packages),
      routes: sortedOf(sizes.routes),
      total: sizes.total,
    },
    null,
    2,
  )}\n`

  assert(text.endsWith('\n'))

  return text
}

export const sizesFileProblems = (
  measured: string,
  committed: string | undefined,
  path: string,
): string[] => {
  assert(measured.length > 0)
  assert(path.length > 0)

  if (committed === undefined) {
    return [`${path} is missing. Run pnpm bundle:write. Rule BSOT-05.`]
  }

  return committed === measured
    ? []
    : [`${path} disagrees with the build. Run pnpm bundle:write. Rule BSOT-05.`]
}
