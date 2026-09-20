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

export type Deviation = {
  approver?: string
  date?: string
  expiry?: string
  rationale?: string
  risk?: string
  rule?: string
}

export type Policy = {
  actions: {
    egress_allowed: string[]
    owners_allowed: string[]
    zizmor_persona: string
  }
  dependency: {
    allow_builds: string[]
    licenses_allowed: string[]
    min_lines_replaced: number
    minimum_release_age_days: number
    records: string
    trust_policy_exclude: string[]
  }
  deviation: { file: string; max_days: number }
  gates: string[]
  repository: { binary_allowlist: string[]; binary_extensions: string[] }
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
const DEVIATION_FIELDS = [
  'rule',
  'rationale',
  'risk',
  'approver',
  'date',
  'expiry',
] as const
const RULE_LINE = /^- \*\*([A-Z]+-\d+) \(([MRA])[^)]*\)\.\*\*/gmu
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

const expected = <T>(name: string, actual: T, wanted: T): string[] => {
  assert(name.length > 0)
  assert(wanted !== undefined)

  return actual === wanted
    ? []
    : [`${name} is ${actual}, policy wants ${wanted}`]
}

const notListed = (
  name: string,
  key: string,
  have: string[],
  allowed: string[],
): string[] => {
  assert(Array.isArray(have))
  assert(Array.isArray(allowed))

  return have
    .filter((item) => !allowed.includes(item))
    .map((item) => `${name} has ${item}, policy ${key} does not`)
}

export const workspaceProblems = (
  policy: Policy,
  workspace: Workspace,
): string[] => {
  assert(policy.dependency.minimum_release_age_days > 0)
  assert(Array.isArray(policy.dependency.allow_builds))

  const minutes = policy.dependency.minimum_release_age_days * MINUTES_PER_DAY
  const problems = [
    ...expected('minimumReleaseAge', workspace.minimumReleaseAge, minutes),
    ...expected('strictDepBuilds', workspace.strictDepBuilds, true),
    ...expected('blockExoticSubdeps', workspace.blockExoticSubdeps, true),
    ...expected('trustPolicy', workspace.trustPolicy, 'no-downgrade'),
    ...notListed(
      'allowBuilds',
      'dependency.allow_builds',
      Object.keys(workspace.allowBuilds ?? {}),
      policy.dependency.allow_builds,
    ),
    ...notListed(
      'trustPolicyExclude',
      'dependency.trust_policy_exclude',
      workspace.trustPolicyExclude ?? [],
      policy.dependency.trust_policy_exclude,
    ),
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
        `${name} cooldown is missing, policy wants ${wanted} or more`,
      )
    } else if (days < wanted) {
      problems.push(
        `${name} cooldown is ${days} days, policy wants ${wanted} or more`,
      )
    }
  }

  assert(problems.length <= dependabot.updates.length)

  return problems
}

export const categoriesOf = (markdown: string): Map<string, string> => {
  assert(typeof markdown === 'string')

  const categories = new Map<string, string>()

  for (const match of markdown.matchAll(RULE_LINE)) {
    const [, rule, category] = match

    assert(rule !== undefined)
    assert(category !== undefined)
    categories.set(rule, category)
  }

  assert(categories.size <= markdown.length)

  return categories
}

const deviationRuleProblems = (
  categories: Map<string, string>,
  rule: string,
): string[] => {
  assert(rule.length > 0)
  assert(categories.size > 0)

  const category = categories.get(rule)

  if (category === undefined) {
    return [`${rule} is not a rule`]
  }

  return category === 'M' ? [`${rule} is mandatory`] : []
}

const deviationDateProblems = (
  maxDays: number,
  date: string,
  expiry: string,
  today: string,
): string[] => {
  assert(maxDays > 0)
  assert(ISO_DATE.test(date))

  if (daysBetween(today, expiry) < 0) {
    return [`expired on ${expiry}`]
  }

  const life = daysBetween(date, expiry)

  return life > maxDays ? [`lives ${life} days, policy allows ${maxDays}`] : []
}

const deviationRecordProblems = (
  policy: Policy,
  categories: Map<string, string>,
  record: Deviation,
  today: string,
): string[] => {
  assert(policy.deviation.max_days > 0)
  assert(ISO_DATE.test(today))

  const missing = DEVIATION_FIELDS.find((field) => !record[field])

  if (missing !== undefined) {
    return [`${missing} is missing`]
  }

  const { date, expiry, rule } = record

  assert(date !== undefined)
  assert(expiry !== undefined)
  assert(rule !== undefined)

  return [
    ...deviationRuleProblems(categories, rule),
    ...deviationDateProblems(policy.deviation.max_days, date, expiry, today),
  ].slice(0, 1)
}

export const deviationProblems = (
  policy: Policy,
  categories: Map<string, string>,
  deviations: Deviation[],
  today: string,
): string[] => {
  assert(Array.isArray(deviations))
  assert(categories.size > 0)

  const problems = deviations.flatMap((record, index) =>
    deviationRecordProblems(policy, categories, record, today).map(
      (problem) =>
        `${record.rule ?? 'unnamed'} deviation ${index + 1}: ${problem}`,
    ),
  )

  assert(problems.length <= deviations.length)

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
    return ['reason does not start with S1, S2, S3, or S4']
  }

  if (entry.ignoreUntil === undefined) {
    return ['ignoreUntil is missing']
  }

  const remaining = daysBetween(today, entry.ignoreUntil)

  if (remaining < 0) {
    return [`expired on ${entry.ignoreUntil}`]
  }

  const deadline = policy.vulnerability.deadline_days[severity]

  assert(deadline !== undefined, `policy has no deadline for ${severity}`)

  if (remaining > deadline) {
    return [
      `expiry ${entry.ignoreUntil} is past the ${severity} deadline of ${deadline} days`,
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
