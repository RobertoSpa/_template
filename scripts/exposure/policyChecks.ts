import { type Direction, type Limits } from '../directions.ts'
import { type Policy, problem, type RouteRecord } from './shared.ts'
import assert from 'node:assert'

const GATE_NAMES = ['policy', 'data', 'adapters', 'output', 'probe']
const LIVE_GATE = 'live'
const RECORDS_MAX = 1_000

const PUBLIC = 'public'
const SERVER_NONE = 'none'
const METHOD = /^[A-Z]+$/u
const PARAMETER = /[:*[]/u
const AUTHORIZE_IMPORT = /from ['"][^'"]*authorize(?:\.ts)?['"]/u
const SAFE_NUMBERS: Array<[string, (policy: Policy) => number, Direction]> = [
  ['deviation.max_days', (policy) => policy.deviation.max_days, 'smaller'],
  [
    'output.file_bytes_max',
    (policy) => policy.output.file_bytes_max,
    'smaller',
  ],
  ['output.files_max', (policy) => policy.output.files_max, 'smaller'],
  [
    'output.security_txt.expires_days_max',
    (policy) => policy.output.security_txt.expires_days_max,
    'smaller',
  ],
  [
    'output.security_txt.expires_days_min',
    (policy) => policy.output.security_txt.expires_days_min,
    'larger',
  ],
  [
    'routes.anonymous_status',
    (policy) => policy.routes.anonymous_status,
    'larger',
  ],
  ['routes.method_status', (policy) => policy.routes.method_status, 'larger'],
]
const SAFE_LISTS: Array<[string, (policy: Policy) => string[], Direction]> = [
  ['headers.absent', (policy) => policy.headers.absent, 'larger'],
  [
    'headers.permissions_denied',
    (policy) => policy.headers.permissions_denied,
    'larger',
  ],
  ['output.dot_allowed', (policy) => policy.output.dot_allowed, 'smaller'],
  [
    'output.served_extensions',
    (policy) => policy.output.served_extensions,
    'smaller',
  ],
  ['probe.paths', (policy) => policy.probe.paths, 'larger'],
  ['routes.audiences', (policy) => policy.routes.audiences, 'smaller'],
]

export const gateProblems = (gates: string[], liveUrl: string): string[] => {
  assert(Array.isArray(gates))
  assert(typeof liveUrl === 'string')

  const wanted = liveUrl.length > 0 ? [...GATE_NAMES, LIVE_GATE] : GATE_NAMES

  return [
    ...wanted
      .filter((name) => !gates.includes(name))
      .map((name) =>
        problem(`gates has no ${name}`, `Add ${name} to gates`, 'ESOT-02'),
      ),
    ...gates
      .filter((name) => !wanted.includes(name))
      .map((name) =>
        problem(
          `gates holds ${name}, which is not a gate`,
          `Remove ${name} from gates`,
          name === LIVE_GATE ? 'PROBE-03' : 'ESOT-02',
        ),
      ),
  ]
}

export const numberProblems = (policy: Policy): string[] => {
  assert(SAFE_NUMBERS.length > 0)
  assert(policy.version >= 1)

  const problems = SAFE_NUMBERS.flatMap(([key, read]) => {
    const value = read(policy)

    if (Number.isInteger(value) && value > 0) {
      return []
    }

    return [
      problem(
        `${key} is ${value}, and it must be a positive integer`,
        `Set ${key} to a positive integer`,
        'ESOT-01',
      ),
    ]
  })

  assert(problems.length <= SAFE_NUMBERS.length)

  return problems
}

// A path with a parameter names the scope of its rows. Rule ROUTE-08.
const scopeProblems = (
  record: RouteRecord,
  index: number,
  scopes: string[],
): string[] => {
  assert(index >= 0)
  assert(scopes.length > 0)

  const path = String(record.path)

  if (PARAMETER.test(path) && record.scope === undefined) {
    return [
      problem(
        `record ${index} has a parameter in its path and no scope`,
        `Set the scope of record ${index} to one of ${scopes.join(', ')}`,
        'ROUTE-08',
      ),
    ]
  }

  if (record.scope !== undefined && !scopes.includes(record.scope)) {
    return [
      problem(
        `record ${index} has the scope ${record.scope}, which is not in routes.scopes`,
        `Set the scope of record ${index} to one of ${scopes.join(', ')}`,
        'ROUTE-08',
      ),
    ]
  }

  return []
}

const recordProblems = (
  record: RouteRecord,
  index: number,
  routes: Policy['routes'],
  serverKind: string,
): string[] => {
  assert(index >= 0)
  assert(index < RECORDS_MAX)

  const problems: string[] = []
  const path = String(record.path)

  if (!path.startsWith('/')) {
    problems.push(
      problem(
        `record ${index} has the path ${path}, and a path starts with /`,
        `Set the path of record ${index} to /${path}`,
        'ROUTE-01',
      ),
    )
  }

  if (!routes.audiences.includes(record.audience)) {
    problems.push(
      problem(
        `record ${index} has the audience ${record.audience}, which is not in routes.audiences`,
        `Set the audience of record ${index} to one of ${routes.audiences.join(', ')}`,
        'ROUTE-01',
      ),
    )
  } else if (record.audience !== PUBLIC && serverKind === SERVER_NONE) {
    problems.push(
      problem(
        `record ${index} has the audience ${record.audience}, and a static build serves each path to the public`,
        `Add a server and set server.kind before a route gets the audience ${record.audience}`,
        'ROUTE-02',
      ),
    )
  }

  problems.push(...scopeProblems(record, index, routes.scopes))

  for (const method of (record.methods ?? []).filter(
    (one) => !METHOD.test(one),
  )) {
    problems.push(
      problem(
        `record ${index} has the method ${method}, and a method is uppercase`,
        `Set the method of record ${index} to ${method.toUpperCase()}`,
        'ROUTE-01',
      ),
    )
  }

  return problems
}

export const routeRecordProblems = (
  records: RouteRecord[],
  bundlePaths: string[],
  routes: Policy['routes'],
  serverKind: string,
): string[] => {
  assert(records.length <= RECORDS_MAX)
  assert(bundlePaths.length <= RECORDS_MAX)

  const seen = new Set<string>()
  const problems: string[] = []

  for (const [index, record] of records.entries()) {
    problems.push(...recordProblems(record, index, routes, serverKind))

    if (seen.has(record.path)) {
      problems.push(
        problem(
          `record ${index} has the path ${record.path} a second time`,
          `Remove record ${index}`,
          'ROUTE-01',
        ),
      )
    }

    seen.add(record.path)
  }

  for (const path of bundlePaths.filter((one) => !seen.has(one))) {
    problems.push(
      problem(
        `the route ${path} has a record in bundle/policy.yaml and no record in routes`,
        `Add a record for ${path} with its audience to exposure/routes.yaml`,
        'ROUTE-01',
      ),
    )
  }

  assert(seen.size <= records.length)

  return problems
}

export const handlerProblems = (files: Array<[string, string]>): string[] => {
  assert(files.length <= RECORDS_MAX)
  assert(Array.isArray(files))

  return files
    .filter(([, text]) => !AUTHORIZE_IMPORT.test(text))
    .map(([path]) =>
      problem(
        `${path} does not import server.authorize`,
        `Import authorize in ${path} and call it before the data`,
        'ROUTE-05',
      ),
    )
}

export const limitsOf = (policy: Policy): Limits => {
  assert(SAFE_NUMBERS.length > 0)
  assert(SAFE_LISTS.length > 0)

  const limits: Limits = {
    lists: [
      ...SAFE_LISTS.map(([key, read, safe]): [string, string[], Direction] => [
        key,
        read(policy),
        safe,
      ]),
      ...Object.entries(policy.headers.csp).map(
        ([name, sources]): [string, string[], Direction] => [
          `headers.csp.${name}`,
          sources,
          'smaller',
        ],
      ),
    ],
    numbers: SAFE_NUMBERS.map(([key, read, safe]) => [key, read(policy), safe]),
  }

  assert(limits.lists.length >= SAFE_LISTS.length)

  return limits
}
