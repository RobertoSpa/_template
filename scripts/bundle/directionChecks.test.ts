import {
  policyDirectionProblems,
  policyOnlyProblems,
  stageDirectionProblems,
} from './directionChecks.ts'
import { type Policy } from './shared.ts'
import { describe, expect, it } from 'vitest'

const policyWith = (changes: Partial<Policy> = {}): Policy => ({
  build: {
    env: { LC_ALL: 'C', TZ: 'UTC' },
    inline_max_bytes: 1_024,
    sourcemap: 'hidden',
    target: 'es2023',
  },
  ceiling: { css: 1_000, js: 1_000, loaded: 3_000, total: 3_000 },
  deviation: { file: 'bundle/deviations.yaml', max_days: 30 },
  files: {
    script: {
      compress: true,
      extensions: ['.js'],
      max_raw: 200,
      max_wire: 100,
      rule: 'BUD-05',
    },
  },
  gates: ['policy', 'size'],
  growth: { branch_max_bytes: 100, review_percent: 20 },
  measure: {
    brotli_quality: 11,
    sizes_file: 'bundle/sizes.json',
    skip_dir: '.vite',
    skip_extensions: ['.map'],
  },
  packages: { denied: ['core-js'] },
  routes: [
    {
      budget: { css: 400, js: 400, loaded: 1_200, total: 1_200 },
      owner: 'RobertoSpa',
      path: '/',
      stage: 'estimate',
    },
  ],
  shake: { side_effects: ['*.css'], test_patterns: ['.test.'] },
  stage: {
    lock_from: 'measured',
    margin: { analysis: 30, estimate: 50, measured: 20, released: 5 },
    order: ['estimate', 'analysis', 'measured', 'released'],
    slack_bytes: 100,
  },
  version: 1,
  ...changes,
})

describe('stageDirectionProblems', () => {
  it.each([
    ['measured', 'released', []],
    ['measured', 'measured', []],
    [
      'measured',
      'analysis',
      ['/ moves from the stage measured back to analysis. Rule STG-03.'],
    ],
  ])('from %s to %s gives %j', (before, after, wanted) => {
    const route = {
      budget: { css: 1, js: 1, loaded: 1, total: 1 },
      owner: 'a',
      path: '/',
    }

    expect(
      stageDirectionProblems(
        [{ ...route, stage: after }],
        [{ ...route, stage: before }],
        ['estimate', 'analysis', 'measured', 'released'],
      ),
    ).toStrictEqual(wanted)
  })
})

describe('policyDirectionProblems', () => {
  it('passes a smaller limit and a larger margin', () => {
    const now = policyWith({
      ceiling: { css: 900, js: 1_000, loaded: 3_000, total: 3_000 },
    })

    expect(policyDirectionProblems(now, policyWith(), [])).toStrictEqual([])
  })

  it('refuses a larger limit with no deviation record', () => {
    const now = policyWith({
      ceiling: { css: 1_001, js: 1_000, loaded: 3_000, total: 3_000 },
    })

    expect(policyDirectionProblems(now, policyWith(), [])).toStrictEqual([
      'ceiling.css moves from 1000 to 1001, the unsafe direction. Rule BSOT-04.',
    ])
  })

  it('passes a larger limit with a BSOT-04 record for its key', () => {
    const now = policyWith({
      ceiling: { css: 1_001, js: 1_000, loaded: 3_000, total: 3_000 },
    })

    expect(
      policyDirectionProblems(now, policyWith(), [
        { place: 'ceiling.css', rule: 'BSOT-04' },
      ]),
    ).toStrictEqual([])
  })

  it.each([
    [
      'a new file extension to skip',
      {
        measure: {
          brotli_quality: 11,
          sizes_file: 'bundle/sizes.json',
          skip_dir: '.vite',
          skip_extensions: ['.map', '.js'],
        },
      },
      'measure.skip_extensions changes, and it has no safe direction. Rule BSOT-04.',
    ],
    [
      'a shorter gate list',
      { gates: ['policy'] },
      'gates changes, and it has no safe direction. Rule BSOT-04.',
    ],
    [
      'a later lock stage',
      {
        stage: {
          lock_from: 'released',
          margin: { analysis: 30, estimate: 50, measured: 20, released: 5 },
          order: ['estimate', 'analysis', 'measured', 'released'],
          slack_bytes: 100,
        },
      },
      'stage.lock_from changes, and it has no safe direction. Rule BSOT-04.',
    ],
    [
      'a removed margin',
      {
        stage: {
          lock_from: 'measured',
          margin: { analysis: 30, estimate: 50, measured: 20 },
          order: ['estimate', 'analysis', 'measured', 'released'],
          slack_bytes: 100,
        },
      },
      'stage.margin.released changes, and it has no safe direction. Rule BSOT-04.',
    ],
    [
      'a new version of the policy',
      { version: 2 },
      'version changes, and it has no safe direction. Rule BSOT-04.',
    ],
  ])('refuses %s', (_title, changes, wanted) => {
    expect(
      policyDirectionProblems(policyWith(changes), policyWith(), []),
    ).toStrictEqual([wanted])
  })

  it('refuses a package that leaves the denied list', () => {
    const base = policyWith()
    const now = policyWith({ packages: { denied: [] } })

    expect(policyDirectionProblems(now, base, [])).toStrictEqual([
      'packages.denied removes core-js, the unsafe direction. Rule BSOT-04.',
    ])
  })
})

describe('policyOnlyProblems', () => {
  const lower = policyWith({
    routes: [
      {
        budget: { css: 300, js: 400, loaded: 1_200, total: 1_200 },
        owner: 'RobertoSpa',
        path: '/',
        stage: 'estimate',
      },
    ],
  })

  it('passes a policy change alone', () => {
    expect(
      policyOnlyProblems(['bundle/policy.yaml'], lower, policyWith()),
    ).toStrictEqual([])
  })

  it('passes a smaller budget next to other files', () => {
    expect(
      policyOnlyProblems(
        ['bundle/policy.yaml', 'src/app/main.tsx'],
        lower,
        policyWith(),
      ),
    ).toStrictEqual([])
  })

  it('passes a new route record and a stage that moves forward, next to other files', () => {
    const now = policyWith({
      routes: [
        {
          budget: { css: 400, js: 400, loaded: 1_200, total: 1_200 },
          owner: 'RobertoSpa',
          path: '/',
          stage: 'analysis',
        },
        {
          budget: { css: 100, js: 100, loaded: 300, total: 300 },
          owner: 'RobertoSpa',
          page: 'settings',
          path: '/settings',
          stage: 'estimate',
        },
      ],
    })

    expect(
      policyOnlyProblems(
        ['bundle/policy.yaml', 'src/pages/settings/ui/SettingsPage.tsx'],
        now,
        policyWith(),
      ),
    ).toStrictEqual([])
  })

  it('passes a removed route record and a renamed page, next to other files', () => {
    const base = policyWith({
      routes: [
        {
          budget: { css: 400, js: 400, loaded: 1_200, total: 1_200 },
          owner: 'RobertoSpa',
          page: 'home',
          path: '/',
          stage: 'estimate',
        },
        {
          budget: { css: 100, js: 100, loaded: 300, total: 300 },
          owner: 'RobertoSpa',
          page: 'settings',
          path: '/settings',
          stage: 'estimate',
        },
      ],
    })
    const now = policyWith({
      routes: [{ ...base.routes[0], page: 'start' }],
    })

    expect(
      policyOnlyProblems(
        ['bundle/policy.yaml', 'src/pages/start/ui/StartPage.tsx'],
        now,
        base,
      ),
    ).toStrictEqual([])
  })

  it('passes the same policy with its keys in a different sequence', () => {
    const { version, ...rest } = policyWith()
    const base = { ...rest, version }
    const now = { version, ...rest }

    expect(Object.keys(now)[0]).not.toBe(Object.keys(base)[0])

    expect(
      policyOnlyProblems(['bundle/policy.yaml', 'src/app/main.tsx'], now, base),
    ).toStrictEqual([])
  })

  it('refuses a larger budget next to other files', () => {
    const now = policyWith({
      routes: [
        {
          budget: { css: 400, js: 401, loaded: 1_200, total: 1_200 },
          owner: 'RobertoSpa',
          path: '/',
          stage: 'estimate',
        },
      ],
    })

    expect(
      policyOnlyProblems(
        ['bundle/policy.yaml', 'src/app/main.tsx'],
        now,
        policyWith(),
      ),
    ).toStrictEqual([
      'the branch changes bundle/policy.yaml and 1 more files. Only a smaller budget, a new or removed route record, a new page name, and a stage that moves forward can go with other files. Rule BSOT-03.',
    ])
  })

  it('refuses a different change of the policy next to other files', () => {
    const now = policyWith({
      growth: { branch_max_bytes: 50, review_percent: 20 },
    })

    expect(
      policyOnlyProblems(
        ['bundle/policy.yaml', 'src/app/main.tsx'],
        now,
        policyWith(),
      ),
    ).toStrictEqual([
      'the branch changes bundle/policy.yaml and 1 more files. Only a smaller budget, a new or removed route record, a new page name, and a stage that moves forward can go with other files. Rule BSOT-03.',
    ])
  })
})
