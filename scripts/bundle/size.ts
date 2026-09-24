import { type Outcome, readText } from '../a11y/shared.ts'
import {
  type Deviation,
  liveDeviations,
  readDeviations,
} from '../deviations.ts'
import { baseRef, onBase, today } from '../security/shared.ts'
import { buildTwice, type Output } from './build.ts'
import {
  countOf,
  groupsOf,
  hashlessName,
  loadedFilesOf,
  type Manifest,
  routeFilesOf,
} from './measure.ts'
import { mapProblems, moduleProblems, originProblems } from './outputChecks.ts'
import { type Count, type Policy, type Sizes } from './shared.ts'
import {
  budgetOf,
  fileLimitProblems,
  growthProblems,
  routeProblems,
  sizesFileProblems,
  sizesTextOf,
  totalOf,
} from './sizeChecks.ts'
import { MODULES_FILE } from './viteBuild.ts'
import assert from 'node:assert'
import { existsSync } from 'node:fs'

export type Measurement = {
  groupOf: Record<string, string>
  problems: string[]
  sizes: Sizes
}

const MANIFEST_FILE = '.vite/manifest.json'
const HTML = 'index.html'
const EMPTY_SIZES: Sizes = {
  files: {},
  packages: {},
  routes: {},
  total: { raw: 0, wire: 0 },
}

const shippedNamesOf = (output: Output, policy: Policy): string[] => {
  assert(output.size > 0)

  const { skip_dir: skipDirectory, skip_extensions: skipExtensions } =
    policy.measure
  const names = [...output.keys()]
    .filter((name) => !name.startsWith(`${skipDirectory}/`))
    .filter(
      (name) => !skipExtensions.some((extension) => name.endsWith(extension)),
    )
    .toSorted()

  assert(names.length <= output.size)

  return names
}

type Counted = {
  countOf: Map<string, Count>
  groupOf: Record<string, string>
  hashless: Map<string, string>
  problems: string[]
}

const countFiles = (
  output: Output,
  names: string[],
  policy: Policy,
): Counted => {
  assert(names.length > 0)
  assert(policy.measure.brotli_quality > 0)

  const counted: Counted = {
    countOf: new Map(),
    groupOf: {},
    hashless: new Map(),
    problems: [],
  }

  for (const name of names) {
    const groups = groupsOf(name, policy.files)
    const plain = hashlessName(name)

    if (groups.length !== 1) {
      counted.problems.push(
        `${name} matches ${groups.length} groups of files, and it must match 1. Rule BYTE-02.`,
      )
      continue
    }

    if (counted.groupOf[plain] !== undefined) {
      counted.problems.push(
        `${plain} names two files of the output. Rule BYTE-04.`,
      )
      continue
    }

    counted.groupOf[plain] = groups[0]
    counted.hashless.set(name, plain)
    counted.countOf.set(
      name,
      countOf(
        output.get(name) ?? new Uint8Array(),
        policy.files[groups[0]].compress,
        policy.measure.brotli_quality,
      ),
    )
  }

  return counted
}

const textsOf = (output: Output, names: string[]): Record<string, string> => {
  assert(names.length <= output.size)

  const decoder = new TextDecoder('utf-8', { fatal: false })

  return Object.fromEntries(
    names.map((name) => [name, decoder.decode(output.get(name))]),
  )
}

const measureOutput = (output: Output, policy: Policy): Measurement => {
  const names = shippedNamesOf(output, policy)
  const counted = countFiles(output, names, policy)

  // A file with no count cannot go into a budget, so the gate stops here.
  if (counted.problems.length > 0) {
    return { groupOf: {}, problems: counted.problems, sizes: EMPTY_SIZES }
  }

  const manifest = JSON.parse(
    textsOf(output, [MANIFEST_FILE])[MANIFEST_FILE],
  ) as Manifest
  const modules = moduleProblems(
    JSON.parse(textsOf(output, [MODULES_FILE])[MODULES_FILE]) as Record<
      string,
      Record<string, number>
    >,
    process.cwd(),
    policy.shake.test_patterns,
  )
  const files = Object.fromEntries(
    [...counted.countOf].map(([name, count]) => [
      counted.hashless.get(name) ?? name,
      count,
    ]),
  )
  const problems = [...counted.problems, ...modules.problems]
  const routes: Sizes['routes'] = {}
  const loaded = new Set(loadedFilesOf(manifest, [HTML]))

  assert(names.length > 0)

  for (const route of policy.routes) {
    const tree = routeFilesOf(manifest, route.page)

    const plain = (name: string) => counted.hashless.get(name) ?? name

    problems.push(...tree.problems)
    routes[route.path] = budgetOf(
      tree.names.map(plain),
      tree.loaded.map(plain),
      files,
    )
  }

  const scripts = names.filter((name) => name.endsWith('.js'))

  problems.push(
    ...scripts
      .filter((name) => !loaded.has(name))
      .map((name) => `${name} is in the tree of no route. Rule SPLIT-02.`),
    ...mapProblems(textsOf(output, scripts), [...output.keys()]),
    ...originProblems(textsOf(output, [HTML, ...scripts])),
  )

  return {
    groupOf: counted.groupOf,
    problems,
    sizes: { files, packages: modules.packages, routes, total: totalOf(files) },
  }
}

export const measure = (policy: Policy): Measurement => {
  const built = buildTwice(policy)

  assert(built.problems.length > 0 || built.output !== undefined)

  if (built.output === undefined || built.problems.length > 0) {
    return { groupOf: {}, problems: built.problems, sizes: EMPTY_SIZES }
  }

  return measureOutput(built.output, policy)
}

const deviationsOf = (policy: Policy): Deviation[] => {
  assert(policy.deviation.file.length > 0)

  const records = liveDeviations(readDeviations(policy.deviation.file), today())

  assert(Array.isArray(records))

  return records
}

const growthOf = (
  policy: Policy,
  sizes: Sizes,
  deviations: Deviation[],
): Outcome => {
  const ref = baseRef()

  assert(policy.measure.sizes_file.length > 0)

  if (ref === undefined) {
    return {
      notes: [],
      problems: [
        'git has no main and no origin/main to compare with. Rule FAIL-01.',
      ],
    }
  }

  const base = onBase(ref, policy.measure.sizes_file)

  if (base === undefined) {
    return {
      notes: [
        `${ref} has no ${policy.measure.sizes_file}, so the growth is not measured`,
      ],
      problems: [],
    }
  }

  return {
    notes: [
      `${sizes.total.wire - (JSON.parse(base) as Sizes).total.wire} wire bytes added to ${ref}`,
    ],
    problems: growthProblems(
      sizes,
      JSON.parse(base) as Sizes,
      policy.growth.branch_max_bytes,
      deviations,
    ),
  }
}

export const checkSize = async (policy: Policy): Promise<Outcome> => {
  assert(policy.routes.length > 0)

  const measured = measure(policy)
  const deviations = deviationsOf(policy)

  if (measured.problems.length > 0) {
    return { notes: [], problems: measured.problems }
  }

  const path = policy.measure.sizes_file
  const committed = existsSync(path) ? readText(path) : undefined
  const growth = growthOf(policy, measured.sizes, deviations)

  assert(measured.sizes.total.wire > 0)

  return {
    notes: [
      `${measured.sizes.total.wire} wire bytes in ${Object.keys(measured.sizes.files).length} files`,
      ...growth.notes,
    ],
    problems: [
      ...fileLimitProblems(
        measured.sizes.files,
        measured.groupOf,
        policy.files,
        deviations,
      ),
      ...routeProblems(measured.sizes.routes, policy, deviations),
      ...sizesFileProblems(sizesTextOf(measured.sizes), committed, path),
      ...growth.problems,
    ],
  }
}
