import assert from 'node:assert'

export type DependencyPolicy = {
  allow_builds: string[]
  min_lines_replaced: number
  trust_policy_exclude: string[]
}

export type DependencyRecord = {
  build?: string
  cause?: string
  lines?: number
  name: string
  since?: string
  trust?: string
  without?: string
}

export type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const RECORDS_FILE = 'security/dependencies.yaml'
const RANGE_MARK = /[\s*<>^x|~]/u

const runtimeRecordProblems = (
  policy: DependencyPolicy,
  record: DependencyRecord,
): string[] => {
  assert(record.name.length > 0)
  assert(policy.min_lines_replaced > 0)

  if (record.cause === undefined) {
    return [`${record.name} record has no cause`]
  }

  if (record.without === undefined) {
    return [`${record.name} record has no without`]
  }

  if (record.lines === undefined) {
    return [`${record.name} record has no lines`]
  }

  if (record.lines < policy.min_lines_replaced) {
    return [
      `${record.name} replaces ${record.lines} lines, policy wants ${policy.min_lines_replaced} or more`,
    ]
  }

  return []
}

const dependencyProblems = (
  policy: DependencyPolicy,
  packageJson: PackageJson,
  byName: Map<string, DependencyRecord>,
): string[] => {
  assert(byName instanceof Map)
  assert(policy.min_lines_replaced > 0)

  const runtime = Object.keys(packageJson.dependencies ?? {})
  const development = Object.keys(packageJson.devDependencies ?? {})
  const problems: string[] = []

  for (const name of [...runtime, ...development]) {
    const record = byName.get(name)

    if (record === undefined) {
      problems.push(`${name} has no record in ${RECORDS_FILE}`)
    } else if (runtime.includes(name)) {
      problems.push(...runtimeRecordProblems(policy, record))
    } else if (record.cause === undefined) {
      problems.push(`${name} record has no cause`)
    }
  }

  assert(problems.length <= runtime.length + development.length)

  return problems
}

const listProblems = (
  names: string[],
  byName: Map<string, DependencyRecord>,
  field: 'build' | 'trust',
  list: string,
): string[] => {
  assert(Array.isArray(names))
  assert(field.length > 0)

  return names
    .filter((name) => byName.get(name)?.[field] === undefined)
    .map((name) => `${name} is in ${list} with no ${field} record`)
}

const staleRecordProblems = (
  packageJson: PackageJson,
  records: DependencyRecord[],
): string[] => {
  assert(Array.isArray(records))
  assert(typeof packageJson === 'object')

  const declared = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ])

  return records
    .filter((record) => record.build === undefined)
    .filter((record) => record.trust === undefined)
    .filter((record) => !declared.has(record.name))
    .map((record) => `${record.name} has a record and is not a dependency`)
}

export const recordProblems = (
  policy: DependencyPolicy,
  packageJson: PackageJson,
  records: DependencyRecord[],
): string[] => {
  assert(Array.isArray(records))
  assert(Array.isArray(policy.allow_builds))

  const byName = new Map(records.map((record) => [record.name, record]))

  assert(byName.size === records.length, 'two records share a name')

  const problems = [
    ...dependencyProblems(policy, packageJson, byName),
    ...listProblems(policy.allow_builds, byName, 'build', 'allow_builds'),
    ...listProblems(
      policy.trust_policy_exclude,
      byName,
      'trust',
      'trust_policy_exclude',
    ),
    ...staleRecordProblems(packageJson, records),
  ]

  assert(problems.every((problem) => problem.length > 0))

  return problems
}

export const pinNotes = (packageJson: PackageJson): string[] => {
  assert(typeof packageJson === 'object')

  const entries = [
    ...Object.entries(packageJson.dependencies ?? {}),
    ...Object.entries(packageJson.devDependencies ?? {}),
  ]
  const notes = entries
    .filter(([, version]) => RANGE_MARK.test(version))
    .map(([name, version]) => `${name} is ${version}, not one version`)

  assert(notes.length <= entries.length)

  return notes
}
