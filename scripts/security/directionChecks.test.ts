import { safeDirectionProblems } from '../directions.ts'
import { limitsOf, removedLevelProblems } from './directionChecks.ts'
import { type Policy } from './policyChecks.ts'
import { describe, expect, it } from 'vitest'

const policy = (): Policy => ({
  actions: {
    egress_allowed: ['github.com:443'],
    owners_allowed: ['actions'],
    zizmor_persona: 'pedantic',
  },
  change: { revert_hours: 24 },
  dependency: {
    allow_builds: ['esbuild'],
    licenses_allowed: ['MIT'],
    max_unmaintained_days: 365,
    min_lines_replaced: 200,
    minimum_release_age_days: 7,
    records: 'security/dependencies.yaml',
    registries_allowed: ['https://registry.npmjs.org'],
    scorecard_min: 5,
    trust_policy_exclude: ['chokidar'],
  },
  deviation: { file: 'security/deviations.yaml', max_days: 30 },
  gates: ['policy'],
  incident: { never_events: ['a push to main'], postmortem_days: 3 },
  release: { bake_minutes: 15 },
  repository: {
    binary_allowlist: ['docs/logo.png'],
    binary_extensions: ['png', 'exe'],
    checks_before_merge: ['checks', 'security'],
  },
  secrets: { filename_patterns: ['.env', '*.pem'] },
  vulnerability: {
    accept_file: 'osv-scanner.toml',
    deadline_days: { S1: 1, S2: 3, S3: 10, S4: 30 },
  },
})

describe('limitsOf', () => {
  it('gives no problem when each limit stays or moves in the safe direction', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      actions: { ...base.actions, owners_allowed: [] },
      dependency: { ...base.dependency, minimum_release_age_days: 14 },
      secrets: { filename_patterns: ['.env', '*.pem', '*.key'] },
      vulnerability: {
        ...base.vulnerability,
        deadline_days: { S1: 0, S2: 3, S3: 10, S4: 30 },
      },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'SOT-05', []),
    ).toStrictEqual([])
  })

  it('names a shorter release age, a longer deadline, and a larger allowlist', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      actions: { ...base.actions, owners_allowed: ['actions', 'someone'] },
      dependency: { ...base.dependency, minimum_release_age_days: 1 },
      vulnerability: {
        ...base.vulnerability,
        deadline_days: { S1: 2, S2: 3, S3: 10, S4: 30 },
      },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'SOT-05', []),
    ).toStrictEqual([
      'dependency.minimum_release_age_days moves from 7 to 1, the unsafe direction. Rule SOT-05.',
      'vulnerability.deadline_days.S1 moves from 1 to 2, the unsafe direction. Rule SOT-05.',
      'actions.owners_allowed adds someone, the unsafe direction. Rule SOT-05.',
    ])
  })

  it('names a list of forbidden things that loses an item', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      incident: { ...base.incident, never_events: [] },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'SOT-05', []),
    ).toStrictEqual([
      'incident.never_events removes a push to main, the unsafe direction. Rule SOT-05.',
    ])
  })

  it('passes a shorter release age with an SOT-05 record for its key', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      dependency: { ...base.dependency, minimum_release_age_days: 1 },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'SOT-05', [
        { place: 'dependency.minimum_release_age_days', rule: 'SOT-05' },
      ]),
    ).toStrictEqual([])
  })
})

describe('removedLevelProblems', () => {
  it('names a deadline level that the branch deletes', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      vulnerability: {
        ...base.vulnerability,
        deadline_days: { S2: 3, S3: 10, S4: 30 },
      },
    }

    expect(removedLevelProblems(now, base, [])).toStrictEqual([
      'vulnerability.deadline_days.S1 is removed, the unsafe direction. Rule SOT-05.',
    ])
  })

  it('passes a deleted deadline level with an SOT-05 record for its key', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      vulnerability: {
        ...base.vulnerability,
        deadline_days: { S2: 3, S3: 10, S4: 30 },
      },
    }

    expect(
      removedLevelProblems(now, base, [
        { place: 'vulnerability.deadline_days.S1', rule: 'SOT-05' },
      ]),
    ).toStrictEqual([])
  })

  it('gives no problem when the branch adds a deadline level', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      vulnerability: {
        ...base.vulnerability,
        deadline_days: { S1: 1, S2: 3, S3: 10, S4: 30, S5: 60 },
      },
    }

    expect(removedLevelProblems(now, base, [])).toStrictEqual([])
  })
})
