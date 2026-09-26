import {
  acceptedVulnerabilityProblems,
  binaryArtifactProblems,
  dependabotProblems,
  type Policy,
  workspaceProblems,
} from './policyChecks.ts'
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

const workspace = () => ({
  allowBuilds: { esbuild: true },
  blockExoticSubdeps: true,
  minimumReleaseAge: 10_080,
  strictDepBuilds: true,
  trustPolicy: 'no-downgrade',
  trustPolicyExclude: ['chokidar'],
})

const today = '2026-09-20'

describe('workspaceProblems', () => {
  it('accepts a workspace file that mirrors the policy', () => {
    expect(workspaceProblems(policy(), workspace())).toStrictEqual([])
  })

  it.each([
    [
      'minimumReleaseAge',
      1_440,
      'minimumReleaseAge is 1440, policy wants 10080. Rule DEP-03.',
    ],
    [
      'strictDepBuilds',
      false,
      'strictDepBuilds is false, policy wants true. Rule DEP-05.',
    ],
    [
      'blockExoticSubdeps',
      false,
      'blockExoticSubdeps is false, policy wants true. Rule DEP-06.',
    ],
    [
      'trustPolicy',
      'ignore',
      'trustPolicy is ignore, policy wants no-downgrade. Rule DEP-07.',
    ],
  ])('refuses %s that drifts', (key, value, problem) => {
    const drifted = { ...workspace(), [key]: value }

    expect(workspaceProblems(policy(), drifted)).toStrictEqual([problem])
  })

  it('refuses an allowBuilds package that the policy does not list', () => {
    const drifted = {
      ...workspace(),
      allowBuilds: { esbuild: true, sharp: true },
    }

    expect(workspaceProblems(policy(), drifted)).toStrictEqual([
      'allowBuilds has sharp, policy dependency.allow_builds does not. Rule DEP-05.',
    ])
  })

  it('refuses a trustPolicyExclude package that the policy does not list', () => {
    const drifted = {
      ...workspace(),
      trustPolicyExclude: ['chokidar', 'semver'],
    }

    expect(workspaceProblems(policy(), drifted)).toStrictEqual([
      'trustPolicyExclude has semver, policy dependency.trust_policy_exclude does not. Rule DEP-07.',
    ])
  })
})

describe('dependabotProblems', () => {
  const dependabot = (days: number | undefined) => ({
    updates: [
      {
        cooldown: days === undefined ? undefined : { 'default-days': days },
        'package-ecosystem': 'npm',
      },
      {
        cooldown: { 'default-days': 7 },
        'package-ecosystem': 'github-actions',
      },
    ],
  })

  it('accepts a cooldown equal to the release age', () => {
    expect(dependabotProblems(policy(), dependabot(7))).toStrictEqual([])
  })

  it.each([
    [3, 'npm cooldown is 3 days, policy wants 7 or more. Rule DEP-04.'],
    [
      undefined,
      'npm cooldown is missing, policy wants 7 or more. Rule DEP-04.',
    ],
  ])('refuses a cooldown of %s', (days, problem) => {
    expect(dependabotProblems(policy(), dependabot(days))).toStrictEqual([
      problem,
    ])
  })
})

describe('acceptedVulnerabilityProblems', () => {
  const accepted = () => ({
    id: 'GHSA-xxxx-yyyy-zzzz',
    ignoreUntil: '2026-09-30',
    reason: 'S3: the vulnerable function is not reachable from a browser',
  })

  it('accepts an entry with a severity and an expiry inside the deadline', () => {
    expect(
      acceptedVulnerabilityProblems(policy(), [accepted()], today),
    ).toStrictEqual([])
  })

  it.each([
    [
      { ignoreUntil: '2026-10-01' },
      'GHSA-xxxx-yyyy-zzzz: expiry 2026-10-01 is past the S3 deadline of 10 days. Rule VULN-01.',
    ],
    [
      { ignoreUntil: '2026-09-19' },
      'GHSA-xxxx-yyyy-zzzz: expired on 2026-09-19. Rule VULN-01.',
    ],
    [
      { ignoreUntil: undefined },
      'GHSA-xxxx-yyyy-zzzz: ignoreUntil is missing. Rule VULN-04.',
    ],
    [
      { reason: 'not reachable' },
      'GHSA-xxxx-yyyy-zzzz: reason does not start with S1, S2, S3, or S4. Rule VULN-04.',
    ],
  ])('refuses %o', (change, problem) => {
    const entry = { ...accepted(), ...change }

    expect(
      acceptedVulnerabilityProblems(policy(), [entry], today),
    ).toStrictEqual([problem])
  })
})

describe('binaryArtifactProblems', () => {
  it('accepts a tracked binary on the allowlist and refuses one off it', () => {
    const tracked = ['src/app/main.tsx', 'docs/logo.png', 'tools/run.exe']

    expect(binaryArtifactProblems(policy(), tracked)).toStrictEqual([
      'tools/run.exe is a binary artifact',
    ])
  })
})
