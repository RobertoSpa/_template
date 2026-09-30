import {
  gateProblems,
  limitsOf,
  numberProblems,
  routeRecordProblems,
  workflowProblems,
} from './policyChecks.ts'
import { describe, expect, it } from 'vitest'

const POLICY = {
  deviation: { file: 'timing/deviations.yaml', max_days: 30 },
  gates: ['policy', 'lab'],
  lab: {
    interaction_threshold_ms: 16,
    report: 'reports/timing.json',
    runs: 5,
    suite: 'e2e/timing.e2e.ts',
  },
  limits: { inp_ms: 200, lcp_ms: 2_500 },
  routes: { file: 'timing/routes.yaml' },
  version: 1,
}
const WORKFLOW = [
  'steps:',
  '  - run: pnpm install',
  '  - run: pnpm timing',
].join('\n')

describe('gateProblems', () => {
  it('gives no problem for the two gates', () => {
    expect(gateProblems(['policy', 'lab'])).toStrictEqual([])
  })

  it.each([
    [['policy'], 'gates has no lab. Rule TSOT-02.'],
    [
      ['policy', 'lab', 'write'],
      'gates holds write, which is not a gate. Rule TSOT-02.',
    ],
  ])('names the defect of %j', (gates, problem) => {
    expect(gateProblems(gates)).toStrictEqual([problem])
  })
})

describe('numberProblems', () => {
  it('gives no problem for the policy of the template', () => {
    expect(numberProblems(POLICY)).toStrictEqual([])
  })

  it.each([
    [
      { lab: { ...POLICY.lab, runs: 0 } },
      'lab.runs is 0, and it must be a positive integer. Rule TSOT-01.',
    ],
    [
      { limits: { inp_ms: 200, lcp_ms: 2_500.5 } },
      'limits.lcp_ms is 2500.5, and it must be a positive integer. Rule TSOT-01.',
    ],
    [
      { lab: { ...POLICY.lab, interaction_threshold_ms: 15 } },
      'lab.interaction_threshold_ms is 15, and Chrome accepts 16 or more. Rule LAB-03.',
    ],
    [
      { lab: { ...POLICY.lab, runs: 101 } },
      'lab.runs is 101, and the limit is 100. Rule TSOT-01.',
    ],
  ])('names the defect of %o', (change, problem) => {
    expect(numberProblems({ ...POLICY, ...change })).toStrictEqual([problem])
  })
})

describe('routeRecordProblems', () => {
  it('gives no problem when each bundle route has a record', () => {
    expect(
      routeRecordProblems([{ control: 'Save', path: '/' }], ['/']),
    ).toStrictEqual([])
  })

  it.each([
    [
      [{ path: 'settings' }],
      ['/'],
      [
        'record 0 has the path settings, and a path starts with /. Rule LAB-02.',
        'the route / has a record in bundle/policy.yaml and no record in routes. Rule LAB-02.',
      ],
    ],
    [
      [{ path: '/' }, { path: '/' }],
      ['/'],
      ['record 1 has the path / a second time. Rule LAB-02.'],
    ],
    [
      [{ control: '', path: '/' }],
      ['/'],
      ['record 0 has an empty control. Rule LAB-03.'],
    ],
  ])('names the defects of %j', (records, bundlePaths, problems) => {
    expect(routeRecordProblems(records, bundlePaths)).toStrictEqual(problems)
  })
})

describe('workflowProblems', () => {
  it('gives no problem for one exact step', () => {
    expect(workflowProblems(WORKFLOW)).toStrictEqual([])
  })

  it.each([
    [
      'steps:\n  - run: pnpm install',
      'the timing workflow has 0 timing steps, and it must have 1. Rule TSOT-02.',
    ],
    [
      'steps:\n  - run: pnpm timing:policy',
      'the timing step of the workflow is not exactly `pnpm timing`. Rule TSOT-02.',
    ],
    [
      `${WORKFLOW}\n  - run: pnpm timing`,
      'the timing workflow has 2 timing steps, and it must have 1. Rule TSOT-02.',
    ],
    [
      `${WORKFLOW}\n    continue-on-error: true`,
      'the timing workflow holds continue-on-error. Rule TSOT-02.',
    ],
  ])('names the defect of %j', (text, problem) => {
    expect(workflowProblems(text)).toStrictEqual([problem])
  })
})

describe('limitsOf', () => {
  it('gives each number with its safe direction', () => {
    expect(limitsOf(POLICY)).toStrictEqual({
      lists: [],
      numbers: [
        ['deviation.max_days', 30, 'smaller'],
        ['lab.interaction_threshold_ms', 16, 'smaller'],
        ['lab.runs', 5, 'larger'],
        ['limits.inp_ms', 200, 'smaller'],
        ['limits.lcp_ms', 2_500, 'smaller'],
      ],
    })
  })
})
