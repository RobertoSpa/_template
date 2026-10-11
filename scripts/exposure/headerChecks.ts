import { HEADER_NAME } from './headers.ts'
import { type Policy, problem } from './shared.ts'
import assert from 'node:assert'

const CSP_REQUIRED: Record<string, string> = {
  'base-uri': "'none'",
  'default-src': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
  'object-src': "'none'",
  'require-trusted-types-for': "'script'",
}
const CSP_BANNED = ["'unsafe-inline'", "'unsafe-eval'", '*', 'http:', 'https:']
const FIXED_REQUIRED: Record<string, string> = {
  'cross-origin-embedder-policy': 'require-corp',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
}
const ABSENT_REQUIRED = [
  'access-control-allow-origin',
  'server',
  'x-powered-by',
  'x-xss-protection',
]

const cspProblems = (csp: Record<string, string[]>): string[] => {
  assert(typeof csp === 'object')

  const problems: string[] = []

  for (const [name, value] of Object.entries(CSP_REQUIRED)) {
    const sources = csp[name] ?? []

    if (sources.length !== 1 || sources[0] !== value) {
      problems.push(
        problem(
          `headers.csp.${name} is not ${value}`,
          `Set headers.csp.${name} to [${value}]`,
          'HDR-02',
        ),
      )
    }
  }

  for (const [name, sources] of Object.entries(csp)) {
    assert(Array.isArray(sources))

    for (const source of sources.filter((one) => CSP_BANNED.includes(one))) {
      problems.push(
        problem(
          `headers.csp.${name} holds ${source}`,
          `Remove ${source} from headers.csp.${name}`,
          'HDR-02',
        ),
      )
    }
  }

  return problems
}

const fixedProblems = (fixed: Record<string, string>): string[] => {
  assert(typeof fixed === 'object')

  const problems: string[] = []

  for (const [name, value] of Object.entries(FIXED_REQUIRED)) {
    if (fixed[name] !== value) {
      problems.push(
        problem(
          `headers.fixed.${name} is not ${value}`,
          `Set headers.fixed.${name} to ${value}`,
          name === 'strict-transport-security' ? 'HDR-03' : 'HDR-05',
        ),
      )
    }
  }

  for (const name of Object.keys(fixed).filter(
    (one) => !HEADER_NAME.test(one),
  )) {
    problems.push(
      problem(
        `headers.fixed holds the name ${name}, and a name is lowercase`,
        `Rename ${name} to lowercase`,
        'HDR-01',
      ),
    )
  }

  return problems
}

// A server mints a nonce per response, and then 'strict-dynamic' holds. Rule HDR-02.
export const nonceProblems = (
  csp: Record<string, string[]>,
  serverKind: string,
): string[] => {
  assert(typeof csp === 'object')
  assert(serverKind.length > 0)

  if (serverKind === 'none') {
    return []
  }

  const sources = csp['script-src'] ?? []

  return sources.includes("'strict-dynamic'")
    ? []
    : [
        problem(
          `server.kind is ${serverKind} and headers.csp.script-src has no 'strict-dynamic'`,
          "Add 'strict-dynamic' to headers.csp.script-src and mint a nonce per response in the server",
          'HDR-02',
        ),
      ]
}

export const headerProblems = (headers: Policy['headers']): string[] => {
  assert(Array.isArray(headers.absent))
  assert(Array.isArray(headers.permissions_denied))

  return [
    ...cspProblems(headers.csp),
    ...fixedProblems(headers.fixed),
    ...ABSENT_REQUIRED.filter((name) => !headers.absent.includes(name)).map(
      (name) =>
        problem(
          `headers.absent has no ${name}`,
          `Add ${name} to headers.absent`,
          'HDR-07',
        ),
    ),
    ...(headers.permissions_denied.length === 0
      ? [
          problem(
            'headers.permissions_denied is empty',
            'Add each unused feature to headers.permissions_denied',
            'HDR-06',
          ),
        ]
      : []),
  ]
}
