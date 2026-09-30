import { labOutcome, medianOf } from './labChecks.ts'
import { describe, expect, it } from 'vitest'

const POLICY = {
  lab: { runs: 5 },
  limits: { inp_ms: 200, lcp_ms: 2_500 },
}
const RECORDS = [{ path: '/' }]
const SAMPLE = { inp_ms: 8, lcp_ms: 120 }
const FIVE = [SAMPLE, SAMPLE, SAMPLE, SAMPLE, SAMPLE]
const DEVIATION = {
  approver: 'RobertoSpa',
  date: '2026-09-30',
  expiry: '2026-10-30',
  place: '/',
  rationale: 'the hero image loads from the origin',
  risk: 'the first paint of the home page is late',
  rule: 'LCP-01',
}

describe('medianOf', () => {
  it.each([
    [[5, 1, 3], 3],
    [[4, 1, 3, 2], 2.5],
    [[7], 7],
  ])('gives the median of %j', (values, median) => {
    expect(medianOf(values)).toBe(median)
  })
})

describe('labOutcome', () => {
  it('gives a note with the two medians for a route within the limits', () => {
    expect(
      labOutcome({ routes: { '/': FIVE } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: ['/ LCP 120 ms, INP 8 ms, the median of 5 runs'],
      problems: [],
    })
  })

  it('takes the median and not the worst run', () => {
    const samples = [
      { inp_ms: 8, lcp_ms: 120 },
      { inp_ms: 8, lcp_ms: 130 },
      { inp_ms: 8, lcp_ms: 110 },
      { inp_ms: 900, lcp_ms: 9_000 },
      { inp_ms: 8, lcp_ms: 125 },
    ]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: ['/ LCP 125 ms, INP 8 ms, the median of 5 runs'],
      problems: [],
    })
  })

  it.each([
    [
      { inp_ms: 8, lcp_ms: 2_501 },
      'the route / has an LCP of 2501 ms, and the limit is 2500 ms. Rule LCP-01.',
    ],
    [
      { inp_ms: 201, lcp_ms: 120 },
      'the route / has an INP of 201 ms, and the limit is 200 ms. Rule INP-01.',
    ],
  ])('refuses the route one step above a limit, %o', (sample, problem) => {
    const samples = [sample, sample, sample, sample, sample]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: [],
      problems: [problem],
    })
  })

  it('passes a route at the limit', () => {
    const sample = { inp_ms: 200, lcp_ms: 2_500 }
    const samples = [sample, sample, sample, sample, sample]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: ['/ LCP 2500 ms, INP 200 ms, the median of 5 runs'],
      problems: [],
    })
  })

  it('gives a note and no LCP for a route that paints no content', () => {
    const sample = { inp_ms: 0, lcp_ms: null }
    const samples = [sample, sample, sample, sample, sample]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: [
        '/ paints no content, so it has no LCP. Rule LCP-01.',
        '/ INP 0 ms, the median of 5 runs',
      ],
      problems: [],
    })
  })

  it('refuses a route that paints content in some runs only', () => {
    const samples = [
      SAMPLE,
      SAMPLE,
      { inp_ms: 8, lcp_ms: null },
      SAMPLE,
      SAMPLE,
    ]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, []),
    ).toStrictEqual({
      notes: [],
      problems: ['the route / painted content in 4 of 5 runs. Rule LAB-01.'],
    })
  })

  it.each([
    [{ routes: {} }, 'the report has no samples for the route /. Rule LAB-01.'],
    [
      { routes: { '/': [SAMPLE, SAMPLE, SAMPLE, SAMPLE] } },
      'the route / has 4 samples, and lab.runs is 5. Rule LAB-01.',
    ],
  ])('refuses a report that is not complete, %o', (report, problem) => {
    expect(labOutcome(report, RECORDS, POLICY, [])).toStrictEqual({
      notes: [],
      problems: [problem],
    })
  })

  it('keeps a refusal of a limit out of the problems when a record deviates', () => {
    const sample = { inp_ms: 8, lcp_ms: 3_000 }
    const samples = [sample, sample, sample, sample, sample]

    expect(
      labOutcome({ routes: { '/': samples } }, RECORDS, POLICY, [DEVIATION]),
    ).toStrictEqual({
      notes: ['/ LCP 3000 ms, INP 8 ms, the median of 5 runs'],
      problems: [],
    })
  })
})
