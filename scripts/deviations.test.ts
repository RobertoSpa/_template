import {
  deviates,
  type Deviation,
  deviationProblems,
  liveDeviations,
} from './deviations.ts'
import { parseRules } from './rules.ts'
import { describe, expect, it } from 'vitest'

const RULES = parseRules(
  [
    '# Rules',
    '',
    '- **NAME-01 (M, proven).** Each image has a text alternative. Cause: one. Test: one.',
    '- **COLOR-02 (R, attested).** The pair obeys the minimum. Cause: one. Test: one.',
  ].join('\n'),
)
const IDS = { expiry: 'DEV-03', fields: 'DEV-01', mandatory: 'DEV-02' }

const deviationWith = (fields: Partial<Deviation>): Deviation => ({
  approver: 'the user',
  date: '2026-09-01',
  expiry: '2026-09-20',
  place: 'src/shared/ui/Button.tsx',
  rationale: 'the vendor widget has no name prop',
  risk: 'a screen reader user cannot name the control',
  rule: 'COLOR-02',
  ...fields,
})

describe('deviationProblems', () => {
  it('accepts a record with each field and a live expiry', () => {
    expect(
      deviationProblems([deviationWith({})], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-15',
      }),
    ).toStrictEqual([])
  })

  it('names each field that the record does not hold, with the rule of the pipeline', () => {
    expect(
      deviationProblems([deviationWith({ rationale: '', risk: '   ' })], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-15',
      }),
    ).toStrictEqual([
      'deviation 1 has no rationale. Rule DEV-01.',
      'deviation 1 has no risk. Rule DEV-01.',
    ])
  })

  it('refuses a pattern in place', () => {
    expect(
      deviationProblems([deviationWith({ place: 'assets/*.js' })], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-15',
      }),
    ).toStrictEqual([
      'deviation 1 has the pattern assets/*.js in place. Name one route, one file, one package, or one key. Rule DEV-01.',
    ])
  })

  it('refuses a record that names a mandatory rule', () => {
    expect(
      deviationProblems([deviationWith({ rule: 'NAME-01' })], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-15',
      }),
    ).toStrictEqual([
      'deviation 1 names NAME-01, which is mandatory. Rule DEV-02.',
    ])
  })

  it('refuses a record that names a rule that does not exist', () => {
    expect(
      deviationProblems([deviationWith({ rule: 'GONE-01' })], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-15',
      }),
    ).toStrictEqual([
      'deviation 1 names GONE-01, which is not a rule. Rule DEV-01.',
    ])
  })

  it('accepts a record on the day of its expiry', () => {
    expect(
      deviationProblems([deviationWith({})], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-20',
      }),
    ).toStrictEqual([])
  })

  it('refuses a record one day after its expiry', () => {
    expect(
      deviationProblems([deviationWith({})], {
        ids: IDS,
        maxDays: 30,
        rules: RULES,
        todayIso: '2026-09-21',
      }),
    ).toStrictEqual(['deviation 1 expired on 2026-09-20. Rule DEV-03.'])
  })

  it('refuses a record that lives one day longer than the limit', () => {
    expect(
      deviationProblems(
        [deviationWith({ date: '2026-09-01', expiry: '2026-10-02' })],
        { ids: IDS, maxDays: 30, rules: RULES, todayIso: '2026-09-15' },
      ),
    ).toStrictEqual([
      'deviation 1 lives 31 days, and deviation.max_days is 30. Rule DEV-03.',
    ])
  })
})

describe('the dates of a deviation', () => {
  const context = {
    ids: IDS,
    maxDays: 30,
    rules: RULES,
    todayIso: '2026-09-15',
  }

  it.each([
    [
      'a start after today',
      { date: '2027-08-25', expiry: '2027-09-20' },
      'deviation 1 starts on 2027-08-25, after today. Rule DEV-03.',
    ],
    [
      'an expiry before the start',
      { date: '2026-09-10', expiry: '2026-09-01' },
      'deviation 1 expires on 2026-09-01, before it starts on 2026-09-10. Rule DEV-03.',
    ],
    [
      'a date that is not YYYY-MM-DD',
      { expiry: '2026/10/01' },
      'deviation 1 has the expiry 2026/10/01, and it is not a date as YYYY-MM-DD. Rule DEV-01.',
    ],
    [
      'a day that the calendar does not have',
      { expiry: '2026-09-31' },
      'deviation 1 has the expiry 2026-09-31, and it is not a date as YYYY-MM-DD. Rule DEV-01.',
    ],
  ])('refuses %s', (_title, dates, wanted) => {
    expect(deviationProblems([deviationWith(dates)], context)).toStrictEqual([
      wanted,
    ])
  })

  it('refuses an empty field and a number in a field, and does not crash', () => {
    expect(
      deviationProblems(
        [{ ...deviationWith({}), approver: null, risk: 5 }],
        context,
      ),
    ).toStrictEqual([
      'deviation 1 has no approver. Rule DEV-01.',
      'deviation 1 has no risk. Rule DEV-01.',
    ])
  })
})

describe('liveDeviations and deviates', () => {
  it('keeps a record up to its expiry day, and drops it one day after', () => {
    const record = deviationWith({ place: '/', rule: 'COLOR-02' })

    expect(liveDeviations([record], '2026-09-20')).toStrictEqual([record])
    expect(liveDeviations([record], '2026-09-21')).toStrictEqual([])
  })

  it('finds a live record by its rule and its place', () => {
    const records = [deviationWith({ place: '/', rule: 'COLOR-02' })]

    expect(deviates(records, 'COLOR-02', '/')).toBe(true)
    expect(deviates(records, 'COLOR-02', '/settings')).toBe(false)
  })
})
