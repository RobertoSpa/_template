import { pinNotes, recordProblems } from './depsChecks.ts'
import { describe, expect, it } from 'vitest'

const policy = {
  allow_builds: ['esbuild'],
  min_lines_replaced: 200,
  trust_policy_exclude: ['chokidar'],
}

const packageJson = () => ({
  dependencies: { react: '19.2.8' },
  devDependencies: { vitest: '4.1.11' },
})

const records = () => [
  {
    cause: 'the UI library',
    lines: 20_000,
    name: 'react',
    since: '2026-09-20',
    without: 'a DOM differ',
  },
  { cause: 'the test runner', name: 'vitest', since: '2026-09-20' },
  {
    build: 'selects the platform binary',
    name: 'esbuild',
    since: '2026-09-20',
  },
  { name: 'chokidar', since: '2026-09-20', trust: '4.0.3 has no provenance' },
]

describe('recordProblems', () => {
  it('accepts a record for each dependency, each build, and each trust exclusion', () => {
    expect(recordProblems(policy, packageJson(), records())).toStrictEqual([])
  })

  it('refuses a dependency with no record', () => {
    const json = {
      ...packageJson(),
      devDependencies: { knip: '6.35.1', vitest: '4.1.11' },
    }

    expect(recordProblems(policy, json, records())).toStrictEqual([
      'knip has no record in security/dependencies.yaml',
    ])
  })

  it.each([
    [{ lines: 50 }, 'react replaces 50 lines, policy wants 200 or more'],
    [{ lines: undefined }, 'react record has no lines'],
    [{ without: undefined }, 'react record has no without'],
    [{ cause: undefined }, 'react record has no cause'],
  ])('refuses a runtime dependency record with %o', (change, problem) => {
    const changed = records().map((record) =>
      record.name === 'react' ? { ...record, ...change } : record,
    )

    expect(recordProblems(policy, packageJson(), changed)).toStrictEqual([
      problem,
    ])
  })

  it('refuses a build package with no build rationale', () => {
    const changed = records().filter((record) => record.name !== 'esbuild')

    expect(recordProblems(policy, packageJson(), changed)).toStrictEqual([
      'esbuild is in allow_builds with no build record',
    ])
  })

  it('refuses a trust exclusion with no trust rationale', () => {
    const changed = records().filter((record) => record.name !== 'chokidar')

    expect(recordProblems(policy, packageJson(), changed)).toStrictEqual([
      'chokidar is in trust_policy_exclude with no trust record',
    ])
  })

  it('refuses a stale record that names no dependency', () => {
    const changed = [
      ...records(),
      { cause: 'gone', name: 'lodash', since: '2026-01-01' },
    ]

    expect(recordProblems(policy, packageJson(), changed)).toStrictEqual([
      'lodash has a record and is not a dependency',
    ])
  })
})

describe('pinNotes', () => {
  it('names each dependency with a range', () => {
    const json = {
      dependencies: { react: '^19.2.8' },
      devDependencies: { knip: '~6.35.1', vitest: '4.1.11' },
    }

    expect(pinNotes(json)).toStrictEqual([
      'react is ^19.2.8, not one version',
      'knip is ~6.35.1, not one version',
    ])
  })
})
