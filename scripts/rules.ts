import assert from 'node:assert'

export type Rule = {
  category: string
  criteria: string[]
  id: string
  layer: string
}
export type RuleLine = { file: string; line: string }
export type RuleSource = { file: string; text: string }

const IDENTIFIER = /^[A-Z]+-\d{2}$/u
const RULE_LINE = /^- \*\*([A-Z]+-\d{2}) \(/gmu
const RULE_FIELDS = /^- \*\*([A-Z]+-\d{2}) \(([^)]+)\)\.\*\* /gmu
const CATEGORY = /^[AMR]$/u
const LAYER = /^[a-z]+$/u
const FIELD_SEPARATOR = ', '
// A bullet that opens with an identifier is a rule line. A different bullet is
// prose, and the count of the rules does not hold it.
const RULE_BULLET = /^- \*\*[A-Z]+-\d{2} /u
const CRITERION = /\d+\.\d+\.\d+/gu
const CITATION = /\bRule ([A-Z]+-\d{2})\b/gu
const BULLET = '- **'
const SOURCES_MAX = 5_000
const LINES_MAX = 100_000

export const isIdentifier = (value: string): boolean => {
  assert(typeof value === 'string')
  assert(value.length < 100)

  const matched = IDENTIFIER.test(value)

  assert(typeof matched === 'boolean')

  return matched
}

export const ruleLinesOf = (sources: RuleSource[], id: string): RuleLine[] => {
  assert(sources.length > 0)
  assert(isIdentifier(id))

  const opening = `- **${id} (`
  const found: RuleLine[] = []

  for (const source of sources) {
    const lines = source.text.split('\n')

    assert(lines.length <= LINES_MAX)

    for (const line of lines.filter((one) => one.startsWith(opening))) {
      found.push({ file: source.file, line })
    }
  }

  assert(found.length <= LINES_MAX)

  return found
}

export const identifiersOf = (sources: RuleSource[]): Set<string> => {
  assert(sources.length > 0)
  assert(sources.length <= SOURCES_MAX)

  const identifiers = new Set<string>()

  for (const source of sources) {
    for (const match of source.text.matchAll(RULE_LINE)) {
      identifiers.add(match[1])
    }
  }

  assert(identifiers.size > 0, 'no rule line parsed')
  assert(identifiers.size <= LINES_MAX)

  return identifiers
}

const ruleOf = (id: string, fields: string[]): Rule | undefined => {
  assert(id.length > 0)
  assert(fields.length > 0)

  const category = fields[0]
  const layer = fields[1] ?? ''

  if (!CATEGORY.test(category)) {
    return undefined
  }

  if (!LAYER.test(layer)) {
    return undefined
  }

  const rest = fields.slice(2).join(FIELD_SEPARATOR)

  return {
    category,
    criteria: [...(rest.match(CRITERION) ?? [])],
    id,
    layer,
  }
}

export const parseRules = (rulesText: string): Rule[] => {
  assert(rulesText.length > 0)
  assert(rulesText.includes(BULLET))

  const rules: Rule[] = []

  for (const match of rulesText.matchAll(RULE_FIELDS)) {
    const rule = ruleOf(match[1], match[2].split(FIELD_SEPARATOR))

    if (rule !== undefined) {
      rules.push(rule)
    }
  }

  assert(rules.length > 0, 'no rule line parsed')
  assert(rules.length <= LINES_MAX)

  return rules
}

export const unparsedProblems = (
  rulesText: string,
  rules: Rule[],
  rule: string,
): string[] => {
  assert(rulesText.length > 0)
  assert(isIdentifier(rule))

  const bullets = rulesText.split('\n').filter((line) => RULE_BULLET.test(line))
  const unparsed = bullets.length - rules.length

  assert(unparsed >= 0)
  assert(bullets.length >= rules.length)

  if (unparsed === 0) {
    return []
  }

  return [
    `${unparsed} bullet lines do not parse as a rule line. Read the shape in the section "How to read a rule". Rule ${rule}.`,
  ]
}

const sourceCitationProblems = (
  source: RuleSource,
  known: Set<string>,
  rule: string,
): string[] => {
  assert(source.file.length > 0)
  assert(known.size > 0)
  assert(isIdentifier(rule))

  const problems: string[] = []
  const lines = source.text.split('\n')

  assert(lines.length <= LINES_MAX)

  for (const [index, line] of lines.entries()) {
    const stale = [...line.matchAll(CITATION)]
      .map((match) => match[1])
      .filter((id) => !known.has(id))

    for (const id of stale) {
      problems.push(
        `${source.file} line ${index + 1} names ${id}, and no rule file holds it. Rule ${rule}.`,
      )
    }
  }

  return problems
}

export const citationProblems = (
  citing: RuleSource[],
  known: Set<string>,
  rule: string,
): string[] => {
  assert(Array.isArray(citing))
  assert(known.size > 0)
  assert(isIdentifier(rule))

  const problems = citing.flatMap((source) =>
    sourceCitationProblems(source, known, rule),
  )

  assert(problems.length >= 0)
  assert(problems.length <= LINES_MAX)

  return problems
}
