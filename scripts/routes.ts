import { readYaml } from './io.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'
import assert from 'node:assert'

const RECORDS_MAX = 1_000

// A routes file with only comments parses as null, and it holds no record.
export const readRecords = <R>(path: string): R[] => {
  assert(path.endsWith('.yaml'))

  const records = readYaml<null | R[]>(path) ?? []

  assert(Array.isArray(records))
  assert(records.length <= RECORDS_MAX)

  return records
}

// The routes of bundle/policy.yaml. Each pipeline with a routes file has one record per path.
export const bundlePathsOf = (): string[] => {
  const { routes } = readPolicy<{
    gates: string[]
    routes: Array<{ path: string }>
  }>(POLICY_PATHS.bundle)

  assert(Array.isArray(routes))
  assert(routes.every((route) => typeof route.path === 'string'))

  return routes.map((route) => route.path)
}
