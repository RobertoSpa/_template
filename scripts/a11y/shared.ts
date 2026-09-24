import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

export type Gate = (policy: Policy) => Outcome
export type Outcome = { notes: string[]; problems: string[] }

const POLICY_PATH = 'a11y/policy.yaml'

export const readText = (path: string): string => {
  assert(path.length > 0)

  const text = readFileSync(path, 'utf8')

  assert(typeof text === 'string')

  return text
}

export const readYaml = <T>(path: string): T => {
  assert(path.endsWith('.yaml') || path.endsWith('.yml'))

  const value = parseYaml(readText(path), { strict: true }) as T

  assert(value !== undefined)
  assert(value !== null)

  return value
}

export const readPolicy = (): Policy => {
  const policy = readYaml<Policy>(POLICY_PATH)

  assert(Array.isArray(policy.gates))
  assert(policy.gates.length > 0)

  return policy
}

export const exists = (path: string): boolean => {
  assert(path.length > 0)

  const found = existsSync(path)

  assert(typeof found === 'boolean')

  return found
}

export const today = (): string => {
  const date = new Date().toISOString().slice(0, 10)

  assert(date.length === 10)
  assert(date.startsWith('20'))

  return date
}

// The folders of a path, in alphabetical sequence. A missing path has none.
export const folders = (path: string): string[] => {
  assert(path.length > 0)

  if (!existsSync(path)) {
    return []
  }

  const entries = readdirSync(path, { withFileTypes: true })

  assert(entries.length <= 10_000)

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted()
}
