import assert from 'node:assert'

export type AcceptedVulnerability = {
  id: string
  ignoreUntil?: string
  reason?: string
}

export type Dependabot = {
  updates: Array<{
    cooldown?: { 'default-days'?: number }
    'package-ecosystem': string
  }>
}

export type Policy = {
  actions: {
    egress_allowed: string[]
    owners_allowed: string[]
    zizmor_persona: string
  }
  change: { revert_hours: number }
  dependency: {
    allow_builds: string[]
    licenses_allowed: string[]
    max_unmaintained_days: number
    min_lines_replaced: number
    minimum_release_age_days: number
    records: string
    registries_allowed: string[]
    scorecard_min: number
    trust_policy_exclude: string[]
  }
  deviation: { file: string; max_days: number }
  gates: string[]
  incident: { never_events: string[]; postmortem_days: number }
  release: { bake_minutes: number }
  repository: {
    binary_allowlist: string[]
    binary_extensions: string[]
    checks_before_merge: string[]
  }
  secrets: { filename_patterns: string[] }
  vulnerability: { accept_file: string; deadline_days: Record<string, number> }
}

export type Workspace = {
  allowBuilds?: Record<string, boolean>
  blockExoticSubdeps?: boolean
  minimumReleaseAge?: number
  strictDepBuilds?: boolean
  trustPolicy?: string
  trustPolicyExclude?: string[]
}

const MINUTES_PER_DAY = 1_440
const MILLISECONDS_PER_DAY = 86_400_000
const SEVERITY_PREFIX = /^(S[1-4]):/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

const daysBetween = (from: string, to: string): number => {
  assert(ISO_DATE.test(from), `${from} is not a date`)
  assert(ISO_DATE.test(to), `${to} is not a date`)

  const milliseconds = Date.parse(to) - Date.parse(from)
  const days = Math.round(milliseconds / MILLISECONDS_PER_DAY)

  assert(Number.isInteger(days))

  return days
}

const expected = <T>(
  name: string,
  actual: T,
  wanted: T,
  rule: string,
): string[] => {
  assert(name.length > 0)
  assert(wanted !== undefined)
  assert(rule.length > 0)

  return actual === wanted
    ? []
    : [`${name} is ${actual}, policy wants ${wanted}. Rule ${rule}.`]
}

type ListCheck = {
  allowed: string[]
  have: string[]
  key: string
  name: string
  rule: string
}

const notListed = (check: ListCheck): string[] => {
  assert(Array.isArray(check.have))
  assert(Array.isArray(check.allowed))
  assert(check.rule.length > 0)

  const extra = check.have.filter((item) => !check.allowed.includes(item))

  assert(extra.length <= check.have.length)

  return extra.map(
    (item) =>
      `${check.name} has ${item}, policy ${check.key} does not. Rule ${check.rule}.`,
  )
}

export const workspaceProblems = (
  policy: Policy,
  workspace: Workspace,
): string[] => {
  assert(policy.dependency.minimum_release_age_days > 0)
  assert(Array.isArray(policy.dependency.allow_builds))

  const minutes = policy.dependency.minimum_release_age_days * MINUTES_PER_DAY
  const problems = [
    ...expected(
      'minimumReleaseAge',
      workspace.minimumReleaseAge,
      minutes,
      'DEP-03',
    ),
    ...expected('strictDepBuilds', workspace.strictDepBuilds, true, 'DEP-05'),
    ...expected(
      'blockExoticSubdeps',
      workspace.blockExoticSubdeps,
      true,
      'DEP-06',
    ),
    ...expected('trustPolicy', workspace.trustPolicy, 'no-downgrade', 'DEP-07'),
    ...notListed({
      allowed: policy.dependency.allow_builds,
      have: Object.keys(workspace.allowBuilds ?? {}),
      key: 'dependency.allow_builds',
      name: 'allowBuilds',
      rule: 'DEP-05',
    }),
    ...notListed({
      allowed: policy.dependency.trust_policy_exclude,
      have: workspace.trustPolicyExclude ?? [],
      key: 'dependency.trust_policy_exclude',
      name: 'trustPolicyExclude',
      rule: 'DEP-07',
    }),
  ]

  assert(problems.every((problem) => problem.length > 0))

  return problems
}

export const dependabotProblems = (
  policy: Policy,
  dependabot: Dependabot,
): string[] => {
  const wanted = policy.dependency.minimum_release_age_days

  assert(wanted > 0)
  assert(Array.isArray(dependabot.updates))

  const problems: string[] = []

  for (const update of dependabot.updates) {
    const name = update['package-ecosystem']
    const days = update.cooldown?.['default-days']

    if (days === undefined) {
      problems.push(
        `${name} cooldown is missing, policy wants ${wanted} or more. Rule DEP-04.`,
      )
    } else if (days < wanted) {
      problems.push(
        `${name} cooldown is ${days} days, policy wants ${wanted} or more. Rule DEP-04.`,
      )
    }
  }

  assert(problems.length <= dependabot.updates.length)

  return problems
}

const acceptedEntryProblems = (
  policy: Policy,
  entry: AcceptedVulnerability,
  today: string,
): string[] => {
  assert(entry.id.length > 0)
  assert(ISO_DATE.test(today))

  const severity = SEVERITY_PREFIX.exec(entry.reason ?? '')?.[1]

  if (severity === undefined) {
    return ['reason does not start with S1, S2, S3, or S4. Rule VULN-04.']
  }

  if (entry.ignoreUntil === undefined) {
    return ['ignoreUntil is missing. Rule VULN-04.']
  }

  const remaining = daysBetween(today, entry.ignoreUntil)

  if (remaining < 0) {
    return [`expired on ${entry.ignoreUntil}. Rule VULN-01.`]
  }

  const deadline = policy.vulnerability.deadline_days[severity]

  assert(deadline !== undefined, `policy has no deadline for ${severity}`)

  if (remaining > deadline) {
    return [
      `expiry ${entry.ignoreUntil} is past the ${severity} deadline of ${deadline} days. Rule VULN-01.`,
    ]
  }

  return []
}

export const acceptedVulnerabilityProblems = (
  policy: Policy,
  accepted: AcceptedVulnerability[],
  today: string,
): string[] => {
  assert(Array.isArray(accepted))
  assert(Object.keys(policy.vulnerability.deadline_days).length > 0)

  const problems = accepted.flatMap((entry) =>
    acceptedEntryProblems(policy, entry, today).map(
      (problem) => `${entry.id}: ${problem}`,
    ),
  )

  assert(problems.length <= accepted.length)

  return problems
}

export const binaryArtifactProblems = (
  policy: Policy,
  tracked: string[],
): string[] => {
  assert(Array.isArray(tracked))
  assert(policy.repository.binary_extensions.length > 0)

  const extensions = new Set(policy.repository.binary_extensions)
  const allowed = new Set(policy.repository.binary_allowlist)
  const problems = tracked
    .filter((path) => extensions.has(path.split('.').at(-1) ?? ''))
    .filter((path) => !allowed.has(path))
    .map((path) => `${path} is a binary artifact`)

  assert(problems.length <= tracked.length)

  return problems
}
