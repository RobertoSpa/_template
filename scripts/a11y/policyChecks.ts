import { type Rule, unparsedProblems } from '../rules.ts'
import assert from 'node:assert'

export type Conformance = {
  adopted_aaa: string[]
  base_criteria: string[]
  obsolete: string[]
}

export type Policy = {
  ambiguous_words: string[]
  attestation: {
    file: string
    independence_is_mandatory: boolean
    methods: string[]
  }
  axe: { rules_disabled: string[]; tags: string[] }
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
    deviation_forbidden: string[]
    file: string
  }
  deviation: { file: string; max_days: number }
  eslint_jsx_a11y: string[]
  focus: {
    contrast_min: number
    obscured_percent_max: number
    outline_min_css_px: number
    perimeter_min_css_px: number
  }
  fuzz: { invariants: string[]; keys: string[]; steps_per_route: number }
  gates: string[]
  golden: {
    announce_directory: string
    aria_directory: string
    focus_directory: string
    update_flag_allowed: boolean
  }
  incident: { never_events: string[] }
  layer: { names: string[] }
  layout: { cumulative_layout_shift_max: number }
  line_length: { max_characters: number; max_characters_cjk: number }
  markup: { rules_required: string[] }
  motion: {
    flashes_per_second_max: number
    reduced_motion_duration_ms_max: number
  }
  patterns: {
    dual_model: string[]
    elements_reserved: string[]
    file: string
    primitives_directory: string
  }
  target: { min_css_px: number; spacing_css_px: number }
  text_spacing: {
    letter_min: number
    line_height_min: number
    paragraph_min: number
    word_min: number
  }
  timing: {
    doherty_ms: number
    limit_extension_count: number
    limit_extension_factor: number
  }
  tokens: { file: string; literals_allowed_in: string[] }
}

const BULLET = '- **'

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
        `${rule.id} has two rule lines. Each identifier is one rule. Read the shape in the section "How to read a rule".`,
      )
    }

    seen.add(rule.id)

    if (!layers.includes(rule.layer)) {
      problems.push(
        `${rule.id} names the layer ${rule.layer}, which layer.names does not hold. Rule LAY-01.`,
      )
    }
  }

  problems.push(...unparsedProblems(rulesText, rules, 'LAY-01'))

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
        `line ${index + 1} holds the word "${word}". No person can test it. Rule ASOT-07.`,
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
        `WCAG ${criterion} is in the scope and no rule names it. Rule ASOT-06.`,
      )
    }
  }

  for (const criterion of [...named].toSorted()) {
    if (!scope.has(criterion)) {
      problems.push(
        `WCAG ${criterion} is named by a rule and the scope does not hold it. Rule ASOT-06.`,
      )
    }
  }

  return problems
}
