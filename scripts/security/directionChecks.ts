import { deviates, type Deviation } from '../deviations.ts'
import { type Direction, type Limits } from '../directions.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'

const numbersOf = (policy: Policy): Array<[string, number, Direction]> => {
  assert(policy.deviation.max_days > 0)
  assert(Object.keys(policy.vulnerability.deadline_days).length > 0)

  const numbers: Array<[string, number, Direction]> = [
    ['change.revert_hours', policy.change.revert_hours, 'smaller'],
    [
      'dependency.max_unmaintained_days',
      policy.dependency.max_unmaintained_days,
      'smaller',
    ],
    [
      'dependency.min_lines_replaced',
      policy.dependency.min_lines_replaced,
      'larger',
    ],
    [
      'dependency.minimum_release_age_days',
      policy.dependency.minimum_release_age_days,
      'larger',
    ],
    ['dependency.scorecard_min', policy.dependency.scorecard_min, 'larger'],
    ['deviation.max_days', policy.deviation.max_days, 'smaller'],
    ['incident.postmortem_days', policy.incident.postmortem_days, 'smaller'],
    ['release.bake_minutes', policy.release.bake_minutes, 'larger'],
    ...Object.entries(policy.vulnerability.deadline_days).map(
      ([severity, days]): [string, number, Direction] => [
        `vulnerability.deadline_days.${severity}`,
        days,
        'smaller',
      ],
    ),
  ]

  assert(
    numbers.length > Object.keys(policy.vulnerability.deadline_days).length,
  )

  return numbers
}

const listsOf = (policy: Policy): Array<[string, string[], Direction]> => {
  assert(Array.isArray(policy.actions.owners_allowed))
  assert(Array.isArray(policy.incident.never_events))

  const lists: Array<[string, string[], Direction]> = [
    ['actions.egress_allowed', policy.actions.egress_allowed, 'smaller'],
    ['actions.owners_allowed', policy.actions.owners_allowed, 'smaller'],
    ['dependency.allow_builds', policy.dependency.allow_builds, 'smaller'],
    [
      'dependency.licenses_allowed',
      policy.dependency.licenses_allowed,
      'smaller',
    ],
    [
      'dependency.registries_allowed',
      policy.dependency.registries_allowed,
      'smaller',
    ],
    [
      'dependency.trust_policy_exclude',
      policy.dependency.trust_policy_exclude,
      'smaller',
    ],
    ['incident.never_events', policy.incident.never_events, 'larger'],
    [
      'repository.binary_allowlist',
      policy.repository.binary_allowlist,
      'smaller',
    ],
    [
      'repository.binary_extensions',
      policy.repository.binary_extensions,
      'larger',
    ],
    [
      'repository.checks_before_merge',
      policy.repository.checks_before_merge,
      'larger',
    ],
    ['secrets.filename_patterns', policy.secrets.filename_patterns, 'larger'],
  ]

  assert(lists.every(([, items]) => Array.isArray(items)))

  return lists
}

// Each number and list of the policy that has a safe direction. Rule SOT-05.
export const limitsOf = (policy: Policy): Limits => {
  assert(policy.gates.length > 0)

  const limits: Limits = { lists: listsOf(policy), numbers: numbersOf(policy) }

  assert(limits.numbers.length > 0)
  assert(limits.lists.length > 0)

  return limits
}

export const removedLevelProblems = (
  now: Policy,
  base: Policy,
  deviations: Deviation[],
): string[] => {
  assert(Object.keys(base.vulnerability.deadline_days).length > 0)
  assert(Array.isArray(deviations))

  const kept = Object.keys(now.vulnerability.deadline_days)
  const removed = Object.keys(base.vulnerability.deadline_days)
    .filter((severity) => !kept.includes(severity))
    .map((severity) => `vulnerability.deadline_days.${severity}`)
    .filter((key) => !deviates(deviations, 'SOT-05', key))

  assert(removed.length <= Object.keys(base.vulnerability.deadline_days).length)

  return removed.map(
    (key) => `${key} is removed, the unsafe direction. Rule SOT-05.`,
  )
}
