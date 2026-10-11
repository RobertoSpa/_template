import { problem } from './shared.ts'
import assert from 'node:assert'

// The keys of each block of the policy file. A key outside this table is refused. Rule ESOT-01.
const KNOWN_KEYS: Record<string, string[]> = {
  '': [
    'data',
    'deviation',
    'gates',
    'headers',
    'live',
    'output',
    'probe',
    'routes',
    'server',
    'version',
  ],
  data: ['firestore', 'hosts', 'kind', 'packages', 'postgres'],
  'data.firestore': ['rules', 'tests'],
  'data.hosts': ['firestore', 'postgres', 'unsupported'],
  'data.packages': ['firestore', 'postgres', 'unsupported'],
  'data.postgres': ['anon_readable', 'migrations', 'tests'],
  deviation: ['file', 'max_days'],
  headers: [
    'absent',
    'cache',
    'csp',
    'fixed',
    'html_content_type',
    'permissions_denied',
  ],
  'headers.cache': ['hashed', 'other'],
  live: ['url'],
  output: [
    'dir',
    'dot_allowed',
    'file_bytes_max',
    'files_max',
    'gitleaks_config',
    'manifest',
    'security_txt',
    'served_extensions',
    'skip',
  ],
  'output.security_txt': ['expires_days_max', 'expires_days_min', 'path'],
  probe: ['foreign_origin', 'paths', 'report', 'suite'],
  routes: [
    'anonymous_status',
    'audiences',
    'file',
    'method_status',
    'methods_default',
    'scopes',
  ],
  server: ['authorize', 'handlers', 'kind'],
}
const KEYS_MAX = 1_000

const blockOf = (
  raw: Record<string, unknown>,
  block: string,
): Record<string, unknown> | undefined => {
  assert(block.length > 0)
  assert(block.split('.').length <= 3)

  let value: unknown = raw

  for (const segment of block.split('.')) {
    if (typeof value !== 'object' || value === null) {
      return undefined
    }

    value = (value as Record<string, unknown>)[segment]
  }

  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

// Each block of the policy file holds only its known keys. Rule ESOT-01.
export const keyProblems = (raw: Record<string, unknown>): string[] => {
  assert(typeof raw === 'object')
  assert(Object.keys(KNOWN_KEYS).length > 0)

  const problems: string[] = []

  for (const [block, known] of Object.entries(KNOWN_KEYS)) {
    const value = block === '' ? raw : blockOf(raw, block)

    if (value === undefined) {
      continue
    }

    for (const key of Object.keys(value).filter(
      (one) => !known.includes(one),
    )) {
      problems.push(
        problem(
          `${block === '' ? key : `${block}.${key}`} is not a key of the policy file`,
          `Remove ${block === '' ? key : `${block}.${key}`} from exposure/policy.yaml`,
          'ESOT-01',
        ),
      )
    }
  }

  assert(problems.length <= KEYS_MAX)

  return problems
}
