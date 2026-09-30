import { type Direction, type Limits } from '../directions.ts'
import { type Policy, type RouteRecord } from './shared.ts'
import assert from 'node:assert'

const GATE_NAMES = ['policy', 'lab']
const TIMING_STEP = /run:\s*pnpm timing\S*/gu
const EXACT_STEP = /run:\s*pnpm timing\s*$/mu
// Chrome refuses a durationThreshold below 16 ms for an event observer.
const INTERACTION_THRESHOLD_MS_MIN = 16
// The suite and labChecks.ts hold the same limit of samples per route.
const RUNS_MAX = 100
const RECORDS_MAX = 1_000
const SAFE_NUMBERS: Array<[string, (policy: Policy) => number, Direction]> = [
  ['deviation.max_days', (policy) => policy.deviation.max_days, 'smaller'],
  [
    'lab.interaction_threshold_ms',
    (policy) => policy.lab.interaction_threshold_ms,
    'smaller',
  ],
  ['lab.runs', (policy) => policy.lab.runs, 'larger'],
  ['limits.inp_ms', (policy) => policy.limits.inp_ms, 'smaller'],
  ['limits.lcp_ms', (policy) => policy.limits.lcp_ms, 'smaller'],
]

export const gateProblems = (gates: string[]): string[] => {
  assert(Array.isArray(gates))
  assert(GATE_NAMES.length > 0)

  return [
    ...GATE_NAMES.filter((name) => !gates.includes(name)).map(
      (name) => `gates has no ${name}. Rule TSOT-02.`,
    ),
    ...gates
      .filter((name) => !GATE_NAMES.includes(name))
      .map((name) => `gates holds ${name}, which is not a gate. Rule TSOT-02.`),
  ]
}

export const numberProblems = (policy: Policy): string[] => {
  assert(typeof policy.lab.runs === 'number')
  assert(SAFE_NUMBERS.length > 0)

  const problems = SAFE_NUMBERS.flatMap(([key, read]) => {
    const value = read(policy)

    if (Number.isInteger(value) && value > 0) {
      return []
    }

    return [
      `${key} is ${value}, and it must be a positive integer. Rule TSOT-01.`,
    ]
  })

  if (policy.lab.interaction_threshold_ms < INTERACTION_THRESHOLD_MS_MIN) {
    problems.push(
      `lab.interaction_threshold_ms is ${policy.lab.interaction_threshold_ms}, and Chrome accepts ${INTERACTION_THRESHOLD_MS_MIN} or more. Rule LAB-03.`,
    )
  }

  if (policy.lab.runs > RUNS_MAX) {
    problems.push(
      `lab.runs is ${policy.lab.runs}, and the limit is ${RUNS_MAX}. Rule TSOT-01.`,
    )
  }

  assert(problems.length <= SAFE_NUMBERS.length + 2)

  return problems
}

const recordProblems = (record: RouteRecord, index: number): string[] => {
  assert(index >= 0)
  assert(index < RECORDS_MAX)

  const problems: string[] = []

  if (!record.path.startsWith('/')) {
    problems.push(
      `record ${index} has the path ${record.path}, and a path starts with /. Rule LAB-02.`,
    )
  }

  if (record.control !== undefined && record.control.trim().length === 0) {
    problems.push(`record ${index} has an empty control. Rule LAB-03.`)
  }

  return problems
}

export const routeRecordProblems = (
  records: RouteRecord[],
  bundlePaths: string[],
): string[] => {
  assert(records.length <= RECORDS_MAX)
  assert(bundlePaths.length <= RECORDS_MAX)

  const seen = new Set<string>()
  const problems: string[] = []

  for (const [index, record] of records.entries()) {
    problems.push(...recordProblems(record, index))

    if (seen.has(record.path)) {
      problems.push(
        `record ${index} has the path ${record.path} a second time. Rule LAB-02.`,
      )
    }

    seen.add(record.path)
  }

  for (const path of bundlePaths.filter((one) => !seen.has(one))) {
    problems.push(
      `the route ${path} has a record in bundle/policy.yaml and no record in routes. Rule LAB-02.`,
    )
  }

  assert(seen.size <= records.length)

  return problems
}

export const workflowProblems = (text: string): string[] => {
  assert(text.length > 0)

  const steps = [...text.matchAll(TIMING_STEP)].length
  const problems: string[] = []

  if (steps !== 1) {
    problems.push(
      `the timing workflow has ${steps} timing steps, and it must have 1. Rule TSOT-02.`,
    )
  } else if (!EXACT_STEP.test(text)) {
    problems.push(
      'the timing step of the workflow is not exactly `pnpm timing`. Rule TSOT-02.',
    )
  }

  if (text.includes('continue-on-error')) {
    problems.push('the timing workflow holds continue-on-error. Rule TSOT-02.')
  }

  assert(problems.length <= 2)

  return problems
}

// A smaller limit and more runs are the safe direction. Rule TSOT-03.
export const limitsOf = (policy: Policy): Limits => {
  assert(policy.limits.lcp_ms > 0)
  assert(policy.lab.runs > 0)

  const limits: Limits = {
    lists: [],
    numbers: SAFE_NUMBERS.map(([key, read, safe]) => [key, read(policy), safe]),
  }

  assert(limits.numbers.length === SAFE_NUMBERS.length)

  return limits
}
