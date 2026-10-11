import assert from 'node:assert'

// One served file of the output. Rule OUT-06.
export type ManifestEntry = { bytes: number; path: string; sha256: string }
export type Policy = {
  data: {
    firestore: { rules: string; tests: string }
    hosts: Record<string, string[]>
    kind: string
    packages: Record<string, string[]>
    postgres: { anon_readable: string[]; migrations: string; tests: string }
  }
  deviation: { file: string; max_days: number }
  gates: string[]
  headers: {
    absent: string[]
    cache: { hashed: string; other: string }
    csp: Record<string, string[]>
    fixed: Record<string, string>
    html_content_type: string
    permissions_denied: string[]
  }
  live: { url: string }
  output: {
    dir: string
    dot_allowed: string[]
    file_bytes_max: number
    files_max: number
    gitleaks_config: string
    manifest: string
    security_txt: {
      expires_days_max: number
      expires_days_min: number
      path: string
    }
    served_extensions: string[]
    skip: string[]
  }
  probe: {
    foreign_origin: string
    paths: string[]
    report: string
    suite: string
  }
  routes: {
    anonymous_status: number
    audiences: string[]
    file: string
    method_status: number
    methods_default: string[]
    scopes: string[]
  }
  server: { authorize: string; handlers: string; kind: string }
  version: number
}
// One response of the probe suite. Rule PROBE-01.
export type Probe = {
  body_sha256: string
  headers: Record<string, string>
  kind: ProbeKind
  method: string
  path: string
  repeated: string[]
  status: number
}
// What the suite asked for, so the gate knows the status to want. Rule PROBE-01.
export type ProbeKind =
  | 'bypass'
  | 'cors'
  | 'manifest'
  | 'map'
  | 'method'
  | 'probe_path'
  | 'route'
  | 'unknown_file'
  | 'unknown_page'
export type Report = {
  console_errors: string[]
  cross_origin_isolated: boolean
  probes: Probe[]
}
// audience is public or a name of routes.audiences. Rule ROUTE-01.
export type RouteRecord = {
  audience: string
  methods?: string[]
  path: string
  scope?: string
}

export const RULES_PATH = 'docs/agents/exposure.md'

const IDENTIFIER = /^[A-Z]+-\d{2}$/u
const IMPERATIVE = /^[A-Z][a-z]+ /u
const PROBLEM_MAX = 1_000

// Rule ESOT-08. Each problem line is a symptom, one action, and the rule.
export const problem = (
  symptom: string,
  action: string,
  rule: string,
): string => {
  assert(symptom.length > 0)
  assert(!symptom.endsWith('.'))
  assert(IMPERATIVE.test(action), `the action ${action} is not an imperative`)
  assert(!action.endsWith('.'))
  assert(IDENTIFIER.test(rule))

  const line = `${symptom}. Do: ${action}. Rule ${rule}.`

  assert(line.length <= PROBLEM_MAX)

  return line
}
