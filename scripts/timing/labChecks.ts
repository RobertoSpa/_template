import { deviates, type Deviation } from '../deviations.ts'
import { type Outcome } from '../gates.ts'
import { type Report, type RouteRecord, type Sample } from './shared.ts'
import assert from 'node:assert'

type LabPolicy = {
  lab: { runs: number }
  limits: { inp_ms: number; lcp_ms: number }
}
type Medians = { inpMs: number; lcpMs: null | number }

const SAMPLES_MAX = 100
const ROUTES_MAX = 1_000
const LCP_RULE = 'LCP-01'
const INP_RULE = 'INP-01'

// An odd count gives the middle value. An even count gives the mean of the two middle values.
export const medianOf = (values: number[]): number => {
  assert(values.length > 0)
  assert(values.length <= SAMPLES_MAX)

  const sorted = values.toSorted((left, right) => left - right)
  const count = sorted.length
  const lowerIndex = Math.floor((count - 1) / 2)
  const upperIndex = Math.floor(count / 2)
  const median = (sorted[lowerIndex] + sorted[upperIndex]) / 2

  assert(median >= sorted[0])
  assert(median <= sorted[count - 1])

  return median
}

const sampleProblems = (
  path: string,
  samples: Sample[] | undefined,
  runs: number,
): string[] => {
  assert(path.startsWith('/'))
  assert(runs > 0)

  if (samples === undefined) {
    return [`the report has no samples for the route ${path}. Rule LAB-01.`]
  }

  if (samples.length !== runs) {
    return [
      `the route ${path} has ${samples.length} samples, and lab.runs is ${runs}. Rule LAB-01.`,
    ]
  }

  const painted = samples.filter((sample) => sample.lcp_ms !== null).length

  assert(painted <= samples.length)

  if (painted === 0 || painted === samples.length) {
    return []
  }

  return [
    `the route ${path} painted content in ${painted} of ${samples.length} runs. Rule LAB-01.`,
  ]
}

const mediansOf = (samples: Sample[]): Medians => {
  assert(samples.length > 0)
  assert(samples.length <= SAMPLES_MAX)

  const lcps = samples
    .map((sample) => sample.lcp_ms)
    .filter((value) => value !== null)

  assert(lcps.length === 0 || lcps.length === samples.length)

  return {
    inpMs: medianOf(samples.map((sample) => sample.inp_ms)),
    lcpMs: lcps.length === 0 ? null : medianOf(lcps),
  }
}

const limitProblems = (
  path: string,
  medians: Medians,
  limits: LabPolicy['limits'],
  deviations: Deviation[],
): string[] => {
  assert(path.startsWith('/'))
  assert(limits.lcp_ms > 0)
  assert(limits.inp_ms > 0)

  const problems: string[] = []
  const lcpOver = medians.lcpMs !== null && medians.lcpMs > limits.lcp_ms
  const inpOver = medians.inpMs > limits.inp_ms

  if (lcpOver && !deviates(deviations, LCP_RULE, path)) {
    problems.push(
      `the route ${path} has an LCP of ${medians.lcpMs} ms, and the limit is ${limits.lcp_ms} ms. Rule ${LCP_RULE}.`,
    )
  }

  if (inpOver && !deviates(deviations, INP_RULE, path)) {
    problems.push(
      `the route ${path} has an INP of ${medians.inpMs} ms, and the limit is ${limits.inp_ms} ms. Rule ${INP_RULE}.`,
    )
  }

  assert(problems.length <= 2)

  return problems
}

const notesOf = (path: string, medians: Medians, runs: number): string[] => {
  assert(path.startsWith('/'))
  assert(runs > 0)

  const tail = `INP ${medians.inpMs} ms, the median of ${runs} runs`

  if (medians.lcpMs === null) {
    return [
      `${path} paints no content, so it has no LCP. Rule ${LCP_RULE}.`,
      `${path} ${tail}`,
    ]
  }

  return [`${path} LCP ${medians.lcpMs} ms, ${tail}`]
}

const routeOutcome = (
  path: string,
  samples: Sample[] | undefined,
  policy: LabPolicy,
  deviations: Deviation[],
): Outcome => {
  assert(path.startsWith('/'))
  assert(policy.lab.runs > 0)

  const problems = sampleProblems(path, samples, policy.lab.runs)

  if (problems.length > 0) {
    return { notes: [], problems }
  }

  assert(samples !== undefined)

  const medians = mediansOf(samples)
  const over = limitProblems(path, medians, policy.limits, deviations)

  if (over.length > 0) {
    return { notes: [], problems: over }
  }

  return { notes: notesOf(path, medians, policy.lab.runs), problems: [] }
}

export const labOutcome = (
  report: Report,
  records: RouteRecord[],
  policy: LabPolicy,
  deviations: Deviation[],
): Outcome => {
  assert(records.length > 0)
  assert(records.length <= ROUTES_MAX)

  const outcome: Outcome = { notes: [], problems: [] }

  for (const route of records) {
    const one = routeOutcome(
      route.path,
      report.routes[route.path],
      policy,
      deviations,
    )

    outcome.notes.push(...one.notes)
    outcome.problems.push(...one.problems)
  }

  assert(outcome.problems.length <= records.length * 2)

  return outcome
}
