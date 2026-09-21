import assert from 'node:assert'

export type Conformance = {
  adopted_aaa: string[]
  base_criteria: string[]
  obsolete: string[]
}

export type Deviation = {
  approver?: string
  date?: string
  expiry?: string
  place?: string
  rationale?: string
  risk?: string
  rule?: string
}

export type Policy = {
  ambiguous_words: string[]
  attestation: {
    file: string
    independence_is_mandatory: boolean
    methods: string[]
  }
  conformance: Conformance
  contrast: {
    large_text_min: number
    non_text_min: number
    text_min: number
  }
  criticality: {
    attestation_days: Record<string, number>
    axes: Record<string, Record<string, string>>
    default: string
    file: string
  }
  deviation: { file: string; max_days: number }
  eslint_jsx_a11y: string[]
  gates: string[]
  golden: {
    announce_directory: string
    aria_directory: string
    focus_directory: string
    update_flag_allowed: boolean
  }
  layer: { names: string[] }
  patterns: {
    dual_model: string[]
    elements_reserved: string[]
    file: string
    primitives_directory: string
  }
  target: { min_css_px: number }
  tokens: { file: string }
}

export type Rule = {
  category: string
  criteria: string[]
  id: string
  layer: string
}

const RULE_LINE =
  /^- \*\*([A-Z]+-\d{2}) \(([AMR]), ([a-z]+), ([^)]+)\)\.\*\* /gmu
// A bullet that opens with an identifier is a rule line. A different bullet is
// prose, and the count of the rules does not hold it.
const RULE_PREFIX = /^- \*\*[A-Z]+-\d{2} /u
const BULLET = '- **'
const CRITERION = /\d+\.\d+\.\d+/gu
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u
const DEVIATION_FIELDS = [
  'approver',
  'date',
  'expiry',
  'place',
  'rationale',
  'risk',
  'rule',
] as const
const RULES_MAX = 1_000
const PROJECT = 'project'
const MS_PER_DAY = 86_400_000

const isIsoDate = (value: string | undefined): boolean => {
  assert(value === undefined || typeof value === 'string')

  const matched = value !== undefined && ISO_DATE.test(value)

  assert(typeof matched === 'boolean')

  return matched
}

export const parseRules = (rulesText: string): Rule[] => {
  assert(rulesText.length > 0)
  assert(rulesText.includes(BULLET))

  const rules: Rule[] = []

  for (const match of rulesText.matchAll(RULE_LINE)) {
    const field = match[4]

    rules.push({
      category: match[2],
      criteria:
        field === PROJECT ? [] : (field.match(CRITERION) ?? []).map(String),
      id: match[1],
      layer: match[3],
    })
  }

  assert(rules.length > 0, 'no rule line parsed')
  assert(rules.length <= RULES_MAX)

  return rules
}

export const ruleShapeProblems = (
  rulesText: string,
  rules: Rule[],
  layers: string[],
): string[] => {
  assert(rulesText.length > 0)
  assert(layers.length > 0)

  const problems: string[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    if (seen.has(rule.id)) {
      problems.push(
        `${rule.id} has two rule lines. Each identifier is one rule.`,
      )
    }

    seen.add(rule.id)

    if (!layers.includes(rule.layer)) {
      problems.push(
        `${rule.id} names the layer ${rule.layer}, which layer.names does not hold.`,
      )
    }
  }

  const bullets = rulesText.split('\n').filter((line) => RULE_PREFIX.test(line))
  const unparsed = bullets.length - rules.length

  assert(unparsed >= 0)

  if (unparsed > 0) {
    problems.push(
      `${unparsed} bullet lines do not parse as a rule line. Read the shape in the section "How to read a rule".`,
    )
  }

  assert(seen.size <= rules.length)

  return problems
}

export const ambiguousWordProblems = (
  rulesText: string,
  words: string[],
): string[] => {
  assert(rulesText.length > 0)
  assert(Array.isArray(words))

  const problems: string[] = []
  const lines = rulesText.split('\n')

  for (const [index, line] of lines.entries()) {
    if (!line.startsWith(BULLET)) {
      continue
    }

    const found = words.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'iu').test(line),
    )

    for (const word of found) {
      problems.push(
        `line ${index + 1} holds the word "${word}". No person can test it. Rule SOT-07.`,
      )
    }
  }

  assert(problems.length >= 0)

  return problems
}

export const criteriaInScope = (conformance: Conformance): string[] => {
  assert(Array.isArray(conformance.base_criteria))
  assert(Array.isArray(conformance.adopted_aaa))

  const scope = new Set([
    ...conformance.base_criteria,
    ...conformance.adopted_aaa,
  ])

  for (const criterion of conformance.obsolete) {
    scope.delete(criterion)
  }

  assert(scope.size > 0)

  return [...scope].toSorted()
}

export const traceabilityProblems = (
  rules: Rule[],
  conformance: Conformance,
): string[] => {
  assert(rules.length > 0)
  assert(Array.isArray(conformance.base_criteria))

  const scope = new Set(criteriaInScope(conformance))
  const named = new Set(rules.flatMap((rule) => rule.criteria))
  const problems: string[] = []

  for (const criterion of [...scope].toSorted()) {
    if (!named.has(criterion)) {
      problems.push(
        `WCAG ${criterion} is in the scope and no rule names it. Rule SOT-06.`,
      )
    }
  }

  for (const criterion of [...named].toSorted()) {
    if (!scope.has(criterion)) {
      problems.push(
        `WCAG ${criterion} is named by a rule and the scope does not hold it. Rule SOT-06.`,
      )
    }
  }

  return problems
}

const deviationFieldProblems = (record: Deviation, index: number): string[] => {
  assert(index >= 0)
  assert(typeof record === 'object')

  const problems: string[] = []

  for (const field of DEVIATION_FIELDS) {
    const value = record[field]

    if (value === undefined || value.trim().length === 0) {
      problems.push(`deviation ${index + 1} has no ${field}. Rule DEV-01.`)
    }
  }

  return problems
}

const deviationDateProblems = (
  record: Deviation,
  index: number,
  maxDays: number,
  todayIso: string,
): string[] => {
  assert(index >= 0)
  assert(maxDays > 0)
  assert(isIsoDate(todayIso))

  const problems: string[] = []
  const dated = isIsoDate(record.date) && isIsoDate(record.expiry)

  if (!dated) {
    return problems
  }

  const start = Date.parse(record.date ?? '')
  const end = Date.parse(record.expiry ?? '')
  const now = Date.parse(todayIso)

  assert(Number.isFinite(start))
  assert(Number.isFinite(end))

  // The division rounds to the nearest whole day.
  const life = Math.round((end - start) / MS_PER_DAY)

  if (end < now) {
    problems.push(
      `deviation ${index + 1} expired on ${record.expiry}. Rule DEV-03.`,
    )
  }

  if (life > maxDays) {
    problems.push(
      `deviation ${index + 1} lives ${life} days, and deviation.max_days is ${maxDays}.`,
    )
  }

  return problems
}

export const deviationProblems = (
  records: Deviation[],
  rules: Rule[],
  maxDays: number,
  todayIso: string,
): string[] => {
  assert(Array.isArray(records))
  assert(maxDays > 0)
  assert(isIsoDate(todayIso))

  const mandatory = new Set(
    rules.filter((rule) => rule.category === 'M').map((rule) => rule.id),
  )
  const known = new Set(rules.map((rule) => rule.id))
  const problems: string[] = []

  for (const [index, record] of records.entries()) {
    problems.push(...deviationFieldProblems(record, index))

    const id = record.rule ?? ''

    if (id.length > 0 && !known.has(id)) {
      problems.push(`deviation ${index + 1} names ${id}, which is not a rule.`)
    }

    if (mandatory.has(id)) {
      problems.push(
        `deviation ${index + 1} names ${id}, which is mandatory. Rule DEV-02.`,
      )
    }

    problems.push(...deviationDateProblems(record, index, maxDays, todayIso))
  }

  assert(problems.length >= 0)

  return problems
}
