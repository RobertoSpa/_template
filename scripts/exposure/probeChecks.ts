import { cacheControlOf, type Header } from './headers.ts'
import { cookieProblems, corsProblems } from './originChecks.ts'
import {
  type ManifestEntry,
  type Policy,
  type Probe,
  type ProbeKind,
  problem,
  type Report,
  type RouteRecord,
} from './shared.ts'
import assert from 'node:assert'

const PROBES_MAX = 10_000
const VIOLATION_CHARS_MAX = 160
const POLICY_VIOLATION = /Content Security Policy/u
// A no-go line ends its symptom with no period, so the console text loses its own.
const TRAILING_PERIODS = /\.+$/u
const STATUS_OK = 200
const STATUS_NOT_FOUND = 404
const PUBLIC = 'public'
const ROOT = '/'
const RULE_OF_HEADER: Record<string, string> = {
  'content-security-policy': 'HDR-02',
  'permissions-policy': 'HDR-06',
  'strict-transport-security': 'HDR-03',
}

const label = (probe: Probe): string => {
  assert(probe.path.length > 0)
  assert(probe.method.length > 0)

  return `${probe.method} ${probe.path}`
}

// The observed value and the wanted value, on one line each. Rule HDR-01.
const setProblems = (probe: Probe, set: Header[]): string[] => {
  assert(set.length > 0)
  assert(set.length <= PROBES_MAX)

  return set
    .filter(([name, value]) => probe.headers[name] !== value)
    .map(([name, value]) =>
      problem(
        `${label(probe)} has ${name}: ${probe.headers[name] ?? '(missing)'}, and the header set has ${name}: ${value}`,
        `Make the server send ${name}: ${value}`,
        RULE_OF_HEADER[name] ?? 'HDR-01',
      ),
    )
}

const absentProblems = (probe: Probe, absent: string[]): string[] => {
  assert(absent.length > 0)
  assert(probe.path.length > 0)

  return absent
    .filter((name) => probe.headers[name] !== undefined)
    .map((name) =>
      problem(
        `${label(probe)} has ${name}: ${probe.headers[name]}`,
        `Make the server drop ${name}`,
        'HDR-07',
      ),
    )
}

const cacheProblems = (probe: Probe, policy: Policy): string[] => {
  assert(policy.headers.cache.other.length > 0)
  assert(probe.path.length > 0)

  const wanted = cacheControlOf(probe.path, probe.status, policy.headers)
  const found = probe.headers['cache-control']

  return found === wanted
    ? []
    : [
        problem(
          `${label(probe)} has cache-control: ${found ?? '(missing)'}, and the rule wants ${wanted}`,
          `Make the server send cache-control: ${wanted} for ${probe.path}`,
          'HDR-09',
        ),
      ]
}

const statusProblem = (
  probe: Probe,
  wanted: number,
  rule: string,
): string[] => {
  assert(wanted > 0)
  assert(rule.length > 0)

  return probe.status === wanted
    ? []
    : [
        problem(
          `${label(probe)} answers ${probe.status}, and the rule wants ${wanted}`,
          `Make the server answer ${wanted} for ${label(probe)}`,
          rule,
        ),
      ]
}

const routeStatus = (
  probe: Probe,
  records: RouteRecord[],
  routes: Policy['routes'],
): number => {
  assert(records.length > 0)
  assert(routes.anonymous_status > 0)

  const record = records.find((one) => one.path === probe.path)

  assert(record !== undefined, `no record for ${probe.path}`)

  return record.audience === PUBLIC ? STATUS_OK : routes.anonymous_status
}

type Context = {
  manifest: ManifestEntry[]
  policy: Policy
  probes: Probe[]
  records: RouteRecord[]
  rootBody: string | undefined
}
type KindCheck = (probe: Probe, context: Context) => string[]

const allowProblems = (probe: Probe): string[] => {
  assert(probe.kind === 'method')
  assert(probe.path.length > 0)

  return probe.headers.allow === undefined
    ? [
        problem(
          `${label(probe)} has no allow header`,
          'Make the server send allow with the methods of the record',
          'ROUTE-03',
        ),
      ]
    : []
}

const bodyProblems = (probe: Probe, rootBody: string | undefined): string[] => {
  assert(probe.kind === 'unknown_page')
  assert(probe.body_sha256.length > 0)

  return probe.body_sha256 === rootBody
    ? []
    : [
        problem(
          `${label(probe)} has a body that is not the body of /`,
          'Make the fallback page the page of /',
          'ROUTE-04',
        ),
      ]
}

// A name that occurs two times combines in one parser and not in another. Rule HDR-01.
const repeatedProblems = (probe: Probe): string[] => {
  assert(Array.isArray(probe.repeated))
  assert(probe.path.length > 0)

  return probe.repeated.map((name) =>
    problem(
      `${label(probe)} has the header ${name} two times`,
      `Make the server send ${name} one time`,
      'HDR-01',
    ),
  )
}

// The served bytes are the bytes of the manifest. Rule OUT-06.
const bodyHashProblems = (
  probe: Probe,
  manifest: ManifestEntry[],
): string[] => {
  assert(probe.kind === 'manifest')
  assert(manifest.length <= PROBES_MAX)

  const entry = manifest.find((one) => `/${one.path}` === probe.path)

  if (entry === undefined || probe.status !== STATUS_OK) {
    return []
  }

  return entry.sha256 === probe.body_sha256
    ? []
    : [
        problem(
          `${label(probe)} has the body ${probe.body_sha256.slice(0, 12)}, and the manifest has ${entry.sha256.slice(0, 12)}`,
          'Upload the files of the manifest, and nothing else, then run the probe again',
          'OUT-06',
        ),
      ]
}

// One check per probe kind. The suite names the kind, and the gate wants the status. Rule PROBE-01.
const KIND_CHECKS: Record<ProbeKind, KindCheck> = {
  bypass: (probe, { probes }) => {
    const plain = probes.find(
      (one) =>
        one.kind === 'route' && one.method === 'GET' && one.path === probe.path,
    )

    return plain === undefined
      ? []
      : statusProblem(probe, plain.status, 'ROUTE-05')
  },
  cors: (probe) => corsProblems(probe),
  manifest: (probe, { manifest }) => [
    ...statusProblem(probe, STATUS_OK, 'PROBE-03'),
    ...bodyHashProblems(probe, manifest),
  ],
  map: (probe) => statusProblem(probe, STATUS_NOT_FOUND, 'ROUTE-04'),
  method: (probe, { policy }) => [
    ...statusProblem(probe, policy.routes.method_status, 'ROUTE-03'),
    ...allowProblems(probe),
  ],
  probe_path: (probe) => statusProblem(probe, STATUS_NOT_FOUND, 'PROBE-02'),
  route: (probe, { policy, records }) =>
    statusProblem(
      probe,
      routeStatus(probe, records, policy.routes),
      'ROUTE-03',
    ),
  unknown_file: (probe) => statusProblem(probe, STATUS_NOT_FOUND, 'ROUTE-04'),
  unknown_page: (probe, { rootBody }) => [
    ...statusProblem(probe, STATUS_OK, 'ROUTE-04'),
    ...bodyProblems(probe, rootBody),
  ],
}

const kindProblems = (probe: Probe, context: Context): string[] => {
  assert(probe.kind.length > 0)
  assert(context.records.length > 0)

  const check = KIND_CHECKS[probe.kind]

  if (check === undefined) {
    return [
      problem(
        `${label(probe)} has the kind ${String(probe.kind)}, which the gate does not know`,
        'Give the probe one of the known kinds',
        'PROBE-01',
      ),
    ]
  }

  return check(probe, context)
}

const contentTypeProblems = (probe: Probe, wanted: string): string[] => {
  assert(wanted.length > 0)
  assert(probe.path.length > 0)

  if (probe.path !== ROOT || probe.kind !== 'route') {
    return []
  }

  const found = probe.headers['content-type']

  return found === wanted
    ? []
    : [
        problem(
          `GET / has content-type: ${found ?? '(missing)'}, and the html type is ${wanted}`,
          `Make the server send content-type: ${wanted} for the html`,
          'HDR-11',
        ),
      ]
}

export const reportProblems = (
  report: Report,
  set: Header[],
  records: RouteRecord[],
  policy: Policy,
  manifest: ManifestEntry[] = [],
): string[] => {
  assert(report.probes.length <= PROBES_MAX)
  assert(report.console_errors.length <= PROBES_MAX)

  const root = report.probes.find(
    (probe) => probe.kind === 'route' && probe.path === ROOT,
  )
  const context = {
    manifest,
    policy,
    probes: report.probes,
    records,
    rootBody: root?.body_sha256,
  }
  const problems = report.probes.flatMap((probe) => [
    ...setProblems(probe, set),
    ...repeatedProblems(probe),
    ...absentProblems(probe, policy.headers.absent),
    ...cookieProblems(probe, policy.server.kind),
    ...cacheProblems(probe, policy),
    ...contentTypeProblems(probe, policy.headers.html_content_type),
    ...kindProblems(probe, context),
  ])

  if (report.probes.length === 0) {
    problems.push(
      problem(
        'the report has no probe',
        'Run the suite, which writes one probe per response',
        'PROBE-01',
      ),
    )
  }

  for (const line of report.console_errors.filter((one) =>
    POLICY_VIOLATION.test(one),
  )) {
    problems.push(
      problem(
        `the page of / logs a policy violation: ${line.slice(0, VIOLATION_CHARS_MAX).replace(TRAILING_PERIODS, '')}`,
        'Remove the inline code from the page, or add its hash to headers.csp',
        'HDR-02',
      ),
    )
  }

  if (!report.cross_origin_isolated) {
    problems.push(
      problem(
        'the page of / reads crossOriginIsolated as false',
        'Make the server send cross-origin-opener-policy: same-origin and cross-origin-embedder-policy: require-corp',
        'HDR-05',
      ),
    )
  }

  return problems
}
