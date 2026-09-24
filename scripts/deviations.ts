import { type Rule } from './rules.ts'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

// The one deviation record of each pipeline. Rules DEV-01 to DEV-03 of security.md.
export type Deviation = {
  approver?: Field
  date?: Field
  expiry?: Field
  place?: Field
  rationale?: Field
  risk?: Field
  rule?: Field
}

// The rule of the calling pipeline that each kind of problem cites.
export type DeviationRules = {
  expiry: string
  fields: string
  mandatory: string
}
// A YAML field can hold any scalar. The checker refuses each field that is not text.
type Field = boolean | null | number | string | undefined

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u
const PATTERN = /[*?[\]{}]/u
const DEVIATION_FIELDS = [
  'approver',
  'date',
  'expiry',
  'place',
  'rationale',
  'risk',
  'rule',
] as const
const DATE_FIELDS = ['date', 'expiry'] as const
const MS_PER_DAY = 86_400_000
const RECORDS_MAX = 1_000

// A real calendar day as YYYY-MM-DD. 2026-09-31 is not one.
const isIsoDate = (value: Field): value is string => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00Z`)
  const real = !Number.isNaN(parsed.getTime())

  assert(typeof real === 'boolean')

  return real && parsed.toISOString().startsWith(value)
}

const isText = (value: Field): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const readDeviations = (path: string): Deviation[] => {
  assert(path.endsWith('.yaml'))

  // A file with only comments parses as null, and null holds no record.
  const parsed = parseYaml(readFileSync(path, 'utf8'), {
    strict: true,
  }) as Deviation[] | null
  const records = parsed ?? []

  assert(Array.isArray(records), `${path} is not a list of records`)

  return records
}

// Only a record that has not expired changes the result of a gate.
export const liveDeviations = (
  records: Deviation[],
  todayIso: string,
): Deviation[] => {
  assert(records.length <= RECORDS_MAX)
  assert(isIsoDate(todayIso))

  return records.filter(
    (record) => isIsoDate(record.expiry) && record.expiry >= todayIso,
  )
}

export const deviates = (
  records: Deviation[],
  rule: string,
  place: string,
): boolean => {
  assert(rule.length > 0)
  assert(place.length > 0)

  const found = records.some(
    (record) => record.rule === rule && record.place === place,
  )

  assert(typeof found === 'boolean')

  return found
}

const fieldProblems = (
  record: Deviation,
  index: number,
  rule: string,
): string[] => {
  assert(index >= 0)
  assert(rule.length > 0)

  const problems = DEVIATION_FIELDS.filter(
    (field) => !isText(record[field]),
  ).map((field) => `deviation ${index + 1} has no ${field}. Rule ${rule}.`)

  for (const field of DATE_FIELDS) {
    const value = record[field]

    if (isText(value) && !isIsoDate(value)) {
      problems.push(
        `deviation ${index + 1} has the ${field} ${value}, and it is not a date as YYYY-MM-DD. Rule ${rule}.`,
      )
    }
  }

  if (isText(record.place) && PATTERN.test(record.place)) {
    problems.push(
      `deviation ${index + 1} has the pattern ${record.place} in place. Name one route, one file, one package, or one key. Rule ${rule}.`,
    )
  }

  return problems
}

const dateProblems = (
  start: string,
  end: string,
  maxDays: number,
  todayIso: string,
): string[] => {
  assert(isIsoDate(start))
  assert(isIsoDate(end))

  // The division rounds to the nearest whole day.
  const life = Math.round((Date.parse(end) - Date.parse(start)) / MS_PER_DAY)
  const problems: string[] = []

  if (start > todayIso) {
    problems.push(`starts on ${start}, after today.`)
  }

  if (end < start) {
    problems.push(`expires on ${end}, before it starts on ${start}.`)
  } else if (end < todayIso) {
    problems.push(`expired on ${end}.`)
  }

  if (life > maxDays) {
    problems.push(`lives ${life} days, and deviation.max_days is ${maxDays}.`)
  }

  return problems
}

const ruleProblems = (
  record: Deviation,
  index: number,
  rules: Rule[],
  ids: DeviationRules,
): string[] => {
  assert(rules.length > 0)
  assert(index >= 0)

  if (!isText(record.rule)) {
    return []
  }

  const id = record.rule
  const found = rules.find((rule) => rule.id === id)

  if (found === undefined) {
    return [
      `deviation ${index + 1} names ${id}, which is not a rule. Rule ${ids.fields}.`,
    ]
  }

  return found.category === 'M'
    ? [
        `deviation ${index + 1} names ${id}, which is mandatory. Rule ${ids.mandatory}.`,
      ]
    : []
}

export const deviationProblems = (
  records: Deviation[],
  context: {
    ids: DeviationRules
    maxDays: number
    rules: Rule[]
    todayIso: string
  },
): string[] => {
  const { ids, maxDays, rules, todayIso } = context

  assert(records.length <= RECORDS_MAX)
  assert(isIsoDate(todayIso))
  assert(maxDays > 0)

  return records.flatMap((record, index) => {
    const { date, expiry } = record
    const dated = isIsoDate(date) && isIsoDate(expiry)
    const dates = dated ? dateProblems(date, expiry, maxDays, todayIso) : []

    return [
      ...fieldProblems(record, index, ids.fields),
      ...ruleProblems(record, index, rules, ids),
      ...dates.map(
        (problem) => `deviation ${index + 1} ${problem} Rule ${ids.expiry}.`,
      ),
    ]
  })
}
