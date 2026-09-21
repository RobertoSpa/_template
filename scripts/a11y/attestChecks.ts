import assert from 'node:assert'

export type Attestation = {
  commit?: string
  criterion?: string
  date?: string
  method?: string
  observed?: string
  route?: string
  signer?: string
  tree_hash?: string
}

export type AttestContext = {
  agentNames: string[]
  classByRoute: Record<string, string>
  daysByClass: Record<string, number>
  defaultClass: string
  methods: string[]
  today: string
}

const REQUIRED_FIELDS = [
  'commit',
  'criterion',
  'date',
  'method',
  'observed',
  'route',
  'signer',
  'tree_hash',
] as const
const EMPTY_ANSWERS = [
  'pass',
  'passed',
  'ok',
  'okay',
  'done',
  'yes',
  'good',
  'fine',
  'n/a',
  'none',
]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u
const MS_PER_DAY = 86_400_000

export type Axes = Record<string, Record<string, string>>

export type RouteRecord = {
  escape?: string
  exposure?: string
  harm?: string
  path?: string
}

export const strictestClass = (classes: string[], fallback: string): string => {
  assert(Array.isArray(classes))
  assert(fallback.length > 0)

  const known = classes.filter((name) => name.length > 0).toSorted()
  const strictest = known[0] ?? fallback

  assert(strictest.length > 0)

  return strictest
}

export const routeClass = (
  route: RouteRecord,
  axes: Axes,
  fallback: string,
): string => {
  assert(typeof route === 'object')
  assert(fallback.length > 0)

  const found = [
    axes.harm?.[route.harm ?? ''] ?? '',
    axes.exposure?.[route.exposure ?? ''] ?? '',
    axes.escape?.[route.escape ?? ''] ?? '',
  ]
  const complete = found.every((name) => name.length > 0)

  if (!complete) {
    return fallback
  }

  return strictestClass(found, fallback)
}

const isEmptyAnswer = (value: string): boolean => {
  assert(typeof value === 'string')

  const normalized = value.trim().toLowerCase()
  const empty = normalized.length === 0 || EMPTY_ANSWERS.includes(normalized)

  assert(typeof empty === 'boolean')

  return empty
}

const classOfRoute = (route: string, context: AttestContext): string => {
  assert(route.length > 0)
  assert(context.defaultClass.length > 0)

  const found = context.classByRoute[route] ?? context.defaultClass

  assert(found.length > 0)

  return found
}

const ageInDays = (date: string, todayIso: string): number => {
  assert(ISO_DATE.test(date))
  assert(ISO_DATE.test(todayIso))

  const start = Date.parse(date)
  const end = Date.parse(todayIso)

  assert(Number.isFinite(start))
  assert(Number.isFinite(end))

  // The division rounds to the nearest whole day.
  return Math.round((end - start) / MS_PER_DAY)
}

const fieldProblems = (record: Attestation, index: number): string[] => {
  assert(index >= 0)
  assert(typeof record === 'object')

  const problems: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = record[field]

    if (value === undefined || value.trim().length === 0) {
      problems.push(`attestation ${index + 1} has no ${field}. Rule ATT-01.`)
    }
  }

  return problems
}

const signerProblems = (
  record: Attestation,
  index: number,
  agentNames: string[],
): string[] => {
  assert(index >= 0)
  assert(Array.isArray(agentNames))

  const problems: string[] = []
  const signer = (record.signer ?? '').trim().toLowerCase()

  if (signer.length === 0) {
    return problems
  }

  const byAgent = agentNames.some((name) => signer.includes(name))

  if (byAgent) {
    problems.push(
      `attestation ${index + 1} is signed by ${record.signer}. The party that wrote the code does not sign the proof. Rule ATT-04.`,
    )
  }

  return problems
}

const ageProblems = (
  record: Attestation,
  index: number,
  context: AttestContext,
): string[] => {
  assert(index >= 0)
  assert(context.today.length === 10)

  const problems: string[] = []
  const date = record.date ?? ''
  const route = record.route ?? ''

  if (!ISO_DATE.test(date) || route.length === 0) {
    return problems
  }

  const className = classOfRoute(route, context)
  const limit = context.daysByClass[className] ?? 0
  const age = ageInDays(date, context.today)

  if (limit > 0 && age > limit) {
    problems.push(
      `attestation ${index + 1} for ${route} is ${age} days old, and the class ${className} gives ${limit} days. Rule ATT-03.`,
    )
  }

  return problems
}

export const attestationProblems = (
  records: Attestation[],
  context: AttestContext,
): string[] => {
  assert(Array.isArray(records))
  assert(context.methods.length > 0)

  const problems: string[] = []

  for (const [index, record] of records.entries()) {
    problems.push(...fieldProblems(record, index))
    problems.push(...signerProblems(record, index, context.agentNames))
    problems.push(...ageProblems(record, index, context))

    const method = record.method ?? ''

    if (method.length > 0 && !context.methods.includes(method)) {
      problems.push(
        `attestation ${index + 1} has the method ${method}, which attestation.methods does not hold. Rule ATT-06.`,
      )
    }

    if (isEmptyAnswer(record.observed ?? '')) {
      problems.push(
        `attestation ${index + 1} has no observation in its field observed. Rule ATT-05.`,
      )
    }
  }

  assert(problems.length >= 0)

  return problems
}
