import { type Outcome } from '../gates.ts'
import { execute, readText, readYaml, tail } from '../io.ts'
import {
  type DependencyRecord,
  type PackageJson,
  pinProblems,
  recordProblems,
} from './depsChecks.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'

const PACKAGE_PATH = 'package.json'
const LOCKFILE_PATH = 'pnpm-lock.yaml'
const NO_PACKAGES_STATUS = 128

const knipProblems = (): string[] => {
  const result = execute('pnpm', ['exec', 'knip', '--no-progress'])

  assert(typeof result.status === 'number')

  return result.status === 0
    ? []
    : ['knip found unused code or dependencies', ...tail(result.output)]
}

const osvProblems = (policy: Policy): string[] => {
  assert(policy.dependency.licenses_allowed.length > 0)

  const result = execute('osv-scanner', [
    'scan',
    'source',
    '--lockfile',
    LOCKFILE_PATH,
    `--licenses=${policy.dependency.licenses_allowed.join(',')}`,
  ])

  assert(typeof result.status === 'number')

  if (result.status === 0 || result.status === NO_PACKAGES_STATUS) {
    return []
  }

  return [
    'osv-scanner found a vulnerability or a license problem. Rule DEP-10 or DEP-11.',
    ...tail(result.output),
  ]
}

export const checkDeps = (policy: Policy): Outcome => {
  assert(policy.dependency.records.length > 0)
  assert(policy.dependency.min_lines_replaced > 0)

  const packageJson = JSON.parse(readText(PACKAGE_PATH)) as PackageJson
  const records = readYaml<DependencyRecord[]>(policy.dependency.records)
  const problems = [
    ...recordProblems(policy.dependency, packageJson, records),
    ...pinProblems(packageJson),
    ...knipProblems(),
    ...osvProblems(policy),
  ]

  assert(Array.isArray(records))

  return { notes: [], problems }
}
