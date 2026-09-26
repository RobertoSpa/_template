import { deviates, type Deviation } from '../deviations.ts'
import { type Direction, type Limits } from '../directions.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'

// Each number of the policy that has a safe direction, by its dotted key. Rule ASOT-05.
const SAFE_NUMBERS: Array<[string, (policy: Policy) => number, Direction]> = [
  [
    'contrast.large_text_min',
    (policy) => policy.contrast.large_text_min,
    'larger',
  ],
  ['contrast.non_text_min', (policy) => policy.contrast.non_text_min, 'larger'],
  ['contrast.text_min', (policy) => policy.contrast.text_min, 'larger'],
  ['deviation.max_days', (policy) => policy.deviation.max_days, 'smaller'],
  ['focus.contrast_min', (policy) => policy.focus.contrast_min, 'larger'],
  [
    'focus.obscured_percent_max',
    (policy) => policy.focus.obscured_percent_max,
    'smaller',
  ],
  [
    'focus.outline_min_css_px',
    (policy) => policy.focus.outline_min_css_px,
    'larger',
  ],
  [
    'focus.perimeter_min_css_px',
    (policy) => policy.focus.perimeter_min_css_px,
    'larger',
  ],
  ['fuzz.steps_per_route', (policy) => policy.fuzz.steps_per_route, 'larger'],
  [
    'layout.cumulative_layout_shift_max',
    (policy) => policy.layout.cumulative_layout_shift_max,
    'smaller',
  ],
  [
    'line_length.max_characters',
    (policy) => policy.line_length.max_characters,
    'smaller',
  ],
  [
    'line_length.max_characters_cjk',
    (policy) => policy.line_length.max_characters_cjk,
    'smaller',
  ],
  [
    'motion.flashes_per_second_max',
    (policy) => policy.motion.flashes_per_second_max,
    'smaller',
  ],
  [
    'motion.reduced_motion_duration_ms_max',
    (policy) => policy.motion.reduced_motion_duration_ms_max,
    'smaller',
  ],
  ['target.min_css_px', (policy) => policy.target.min_css_px, 'larger'],
  ['target.spacing_css_px', (policy) => policy.target.spacing_css_px, 'larger'],
  [
    'text_spacing.letter_min',
    (policy) => policy.text_spacing.letter_min,
    'larger',
  ],
  [
    'text_spacing.line_height_min',
    (policy) => policy.text_spacing.line_height_min,
    'larger',
  ],
  [
    'text_spacing.paragraph_min',
    (policy) => policy.text_spacing.paragraph_min,
    'larger',
  ],
  ['text_spacing.word_min', (policy) => policy.text_spacing.word_min, 'larger'],
  ['timing.doherty_ms', (policy) => policy.timing.doherty_ms, 'smaller'],
  [
    'timing.limit_extension_count',
    (policy) => policy.timing.limit_extension_count,
    'larger',
  ],
  [
    'timing.limit_extension_factor',
    (policy) => policy.timing.limit_extension_factor,
    'larger',
  ],
]

const SAFE_LISTS: Array<[string, (policy: Policy) => string[], Direction]> = [
  ['ambiguous_words', (policy) => policy.ambiguous_words, 'larger'],
  ['axe.rules_disabled', (policy) => policy.axe.rules_disabled, 'smaller'],
  ['axe.tags', (policy) => policy.axe.tags, 'larger'],
  [
    'conformance.adopted_aaa',
    (policy) => policy.conformance.adopted_aaa,
    'larger',
  ],
  [
    'conformance.base_criteria',
    (policy) => policy.conformance.base_criteria,
    'larger',
  ],
  [
    'criticality.deviation_forbidden',
    (policy) => policy.criticality.deviation_forbidden,
    'larger',
  ],
  ['eslint_jsx_a11y', (policy) => policy.eslint_jsx_a11y, 'larger'],
  ['fuzz.invariants', (policy) => policy.fuzz.invariants, 'larger'],
  ['fuzz.keys', (policy) => policy.fuzz.keys, 'larger'],
  ['incident.never_events', (policy) => policy.incident.never_events, 'larger'],
  ['markup.rules_required', (policy) => policy.markup.rules_required, 'larger'],
  [
    'patterns.elements_reserved',
    (policy) => policy.patterns.elements_reserved,
    'larger',
  ],
  [
    'tokens.literals_allowed_in',
    (policy) => policy.tokens.literals_allowed_in,
    'smaller',
  ],
]

export const limitsOf = (policy: Policy): Limits => {
  assert(policy.gates.length > 0)
  assert(Object.keys(policy.criticality.attestation_days).length > 0)

  const attestationDays = Object.entries(
    policy.criticality.attestation_days,
  ).map(([level, days]): [string, number, Direction] => [
    `criticality.attestation_days.${level}`,
    days,
    'smaller',
  ])
  const limits: Limits = {
    lists: SAFE_LISTS.map(([key, read, safe]) => [key, read(policy), safe]),
    numbers: [
      ...SAFE_NUMBERS.map(([key, read, safe]): [string, number, Direction] => [
        key,
        read(policy),
        safe,
      ]),
      ...attestationDays,
    ],
  }

  assert(limits.numbers.length === SAFE_NUMBERS.length + attestationDays.length)
  assert(limits.lists.length === SAFE_LISTS.length)

  return limits
}

export const removedLevelProblems = (
  now: Policy,
  base: Policy,
  deviations: Deviation[],
): string[] => {
  assert(Object.keys(base.criticality.attestation_days).length > 0)
  assert(Array.isArray(deviations))

  const kept = Object.keys(now.criticality.attestation_days)
  const removed = Object.keys(base.criticality.attestation_days)
    .filter((level) => !kept.includes(level))
    .map((level) => `criticality.attestation_days.${level}`)
    .filter((key) => !deviates(deviations, 'ASOT-05', key))

  assert(
    removed.length <= Object.keys(base.criticality.attestation_days).length,
  )

  return removed.map(
    (key) => `${key} is removed, the unsafe direction. Rule ASOT-05.`,
  )
}
