import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

export type Execution = { output: string; status: number }
export type Gate = (policy: Policy) => Outcome
export type Outcome = { notes: string[]; problems: string[] }

const POLICY_PATH = 'security/policy.yaml'
const OUTPUT_BYTES_MAX = 67_108_864
const TAIL_LINES = 20
const MISSING_TOOL_STATUS = 127

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

export const execute = (command: string, args: string[]): Execution => {
  assert(command.length > 0)
  assert(Array.isArray(args))

  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: OUTPUT_BYTES_MAX,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error !== undefined) {
    return {
      output: `${command}: ${result.error.message}. Run: mise install`,
      status: MISSING_TOOL_STATUS,
    }
  }

  assert(result.status !== null, `${command} ended by a signal`)

  return { output: `${result.stdout}${result.stderr}`, status: result.status }
}

export const tail = (output: string): string[] => {
  assert(typeof output === 'string')

  const lines = output.split('\n').filter((line) => line.trim().length > 0)

  assert(lines.length >= 0)

  return lines.slice(-TAIL_LINES)
}

export const trackedFiles = (): string[] => {
  const listing = execute('git', ['ls-files', '-z'])

  assert(listing.status === 0, 'git ls-files failed')

  const files = listing.output.split('\0').filter((path) => path.length > 0)

  assert(files.length > 0)

  return files
}

export const today = (): string => {
  const date = new Date().toISOString().slice(0, 10)

  assert(date.length === 10)
  assert(date.startsWith('20'))

  return date
}
