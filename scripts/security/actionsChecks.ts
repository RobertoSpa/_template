import assert from 'node:assert'

export type ActionsPolicy = {
  egress_allowed: string[]
  owners_allowed: string[]
}

export type Workflow = {
  jobs?: Record<string, { steps?: Step[] }>
  on?: Record<string, null | Record<string, string[]>> | string | string[]
  permissions?: Record<string, string>
}

type Step = {
  env?: Record<string, string>
  run?: string
  uses?: string
  with?: Record<string, boolean | number | string>
}

const HARDEN_RUNNER = 'step-security/harden-runner'
const SHA_REFERENCE = /^[^@]+@[0-9a-f]{40}$/u
const SECRET_REFERENCE = /secrets\.([A-Za-z_]\w*)/gu
const STEPS_MAX = 200

const topLevelProblems = (name: string, workflow: Workflow): string[] => {
  assert(name.length > 0)
  assert(typeof workflow === 'object')

  const problems: string[] = []
  const permissions = workflow.permissions

  if (permissions === undefined || Object.keys(permissions).length > 0) {
    problems.push(`${name}: permissions at the top is not {}. Rule CI-02.`)
  }

  const triggers =
    typeof workflow.on === 'object' && !Array.isArray(workflow.on)
      ? Object.keys(workflow.on)
      : []

  if (triggers.includes('pull_request_target')) {
    problems.push(`${name}: uses the trigger pull_request_target. Rule CI-03.`)
  }

  assert(problems.length <= 2)

  return problems
}

const hardenRunnerProblems = (
  policy: ActionsPolicy,
  prefix: string,
  first: Step | undefined,
): string[] => {
  assert(prefix.length > 0)
  assert(Array.isArray(policy.egress_allowed))

  if (
    first?.uses === undefined ||
    !first.uses.startsWith(`${HARDEN_RUNNER}@`)
  ) {
    return [`${prefix}: the first step is not ${HARDEN_RUNNER}. Rule CI-05.`]
  }

  if (first.with?.['egress-policy'] !== 'block') {
    return [`${prefix}: egress-policy is not block. Rule CI-05.`]
  }

  const endpoints = String(first.with['allowed-endpoints'] ?? '')
    .split(/\s+/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return endpoints
    .filter((endpoint) => !policy.egress_allowed.includes(endpoint))
    .map(
      (endpoint) =>
        `${prefix}: endpoint ${endpoint} is not in policy actions.egress_allowed`,
    )
}

const usesProblems = (
  policy: ActionsPolicy,
  prefix: string,
  uses: string,
): string[] => {
  assert(uses.length > 0)
  assert(Array.isArray(policy.owners_allowed))

  if (uses.startsWith('./')) {
    return []
  }

  if (!SHA_REFERENCE.test(uses)) {
    return [`${prefix}: ${uses} is not pinned to a SHA. Rule CI-01.`]
  }

  const owner = uses.split('/')[0] ?? ''

  return policy.owners_allowed.includes(owner)
    ? []
    : [`${prefix}: owner ${owner} is not in policy actions.owners_allowed`]
}

const secretProblems = (prefix: string, step: Step): string[] => {
  assert(prefix.length > 0)
  assert(typeof step === 'object')

  const text = JSON.stringify(step)
  const names = [...text.matchAll(SECRET_REFERENCE)].map(
    (match) => match[1] ?? '',
  )

  return names
    .filter((secret) => secret !== 'GITHUB_TOKEN')
    .map((secret) => `${prefix}: uses the long-lived secret ${secret}`)
}

const jobProblems = (
  policy: ActionsPolicy,
  prefix: string,
  steps: Step[],
): string[] => {
  assert(steps.length <= STEPS_MAX)
  assert(prefix.length > 0)

  const problems = [...hardenRunnerProblems(policy, prefix, steps[0])]

  for (const step of steps.slice(1)) {
    if (step.uses !== undefined) {
      problems.push(...usesProblems(policy, prefix, step.uses))
    }

    problems.push(...secretProblems(prefix, step))
  }

  assert(problems.every((problem) => problem.startsWith(prefix)))

  return problems
}

export const workflowProblems = (
  policy: ActionsPolicy,
  name: string,
  workflow: Workflow,
): string[] => {
  assert(name.length > 0)
  assert(Array.isArray(policy.owners_allowed))

  const problems = [...topLevelProblems(name, workflow)]

  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    problems.push(
      ...jobProblems(policy, `${name} job ${jobName}`, job.steps ?? []),
    )
  }

  assert(problems.every((problem) => problem.startsWith(name)))

  return problems
}
