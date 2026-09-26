import { safeDirectionProblems } from '../directions.ts'
import { limitsOf, removedLevelProblems } from './directionChecks.ts'
import { type Policy } from './policyChecks.ts'
import { describe, expect, it } from 'vitest'

describe('limitsOf', () => {
  const policy = (): Policy => ({
    ambiguous_words: ['easy'],
    attestation: {
      file: 'a11y/attestations.yaml',
      independence_is_mandatory: true,
      methods: ['test'],
    },
    axe: { rules_disabled: [], tags: ['wcag2a'] },
    conformance: {
      adopted_aaa: ['1.4.6'],
      base_criteria: ['1.1.1'],
      obsolete: ['4.1.1'],
    },
    contrast: { large_text_min: 4.5, non_text_min: 3, text_min: 7 },
    criticality: {
      attestation_days: { C1: 30, C2: 90 },
      axes: { harm: { blocked: 'C1' } },
      default: 'C1',
      deviation_forbidden: ['C1'],
      file: 'a11y/routes.yaml',
    },
    deviation: { file: 'a11y/deviations.yaml', max_days: 30 },
    eslint_jsx_a11y: ['alt-text'],
    focus: {
      contrast_min: 3,
      obscured_percent_max: 0,
      outline_min_css_px: 4,
      perimeter_min_css_px: 2,
    },
    fuzz: {
      invariants: ['no_state_has_no_exit'],
      keys: ['Tab'],
      steps_per_route: 400,
    },
    gates: ['policy'],
    golden: {
      announce_directory: 'a11y/announce',
      aria_directory: 'a11y/aria',
      focus_directory: 'a11y/focus',
      update_flag_allowed: false,
    },
    incident: { never_events: ['a keyboard trap'] },
    layer: { names: ['proven'] },
    layout: { cumulative_layout_shift_max: 0 },
    line_length: { max_characters: 80, max_characters_cjk: 40 },
    markup: { rules_required: ['duplicate-id'] },
    motion: { flashes_per_second_max: 3, reduced_motion_duration_ms_max: 200 },
    patterns: {
      dual_model: ['tabs'],
      elements_reserved: ['button'],
      file: 'a11y/patterns.yaml',
      primitives_directory: 'src/shared/ui',
    },
    target: { min_css_px: 44, spacing_css_px: 24 },
    text_spacing: {
      letter_min: 0.12,
      line_height_min: 1.5,
      paragraph_min: 2,
      word_min: 0.16,
    },
    timing: {
      doherty_ms: 400,
      limit_extension_count: 10,
      limit_extension_factor: 10,
    },
    tokens: {
      file: 'a11y/tokens.yaml',
      literals_allowed_in: ['a11y/tokens.yaml'],
    },
  })

  it('gives no problem when each limit stays or moves in the safe direction', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      axe: { ...base.axe, tags: ['wcag2a', 'wcag2aa'] },
      contrast: { ...base.contrast, text_min: 7.5 },
      criticality: {
        ...base.criticality,
        attestation_days: { C1: 14, C2: 90 },
      },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'ASOT-05', []),
    ).toStrictEqual([])
  })

  it('names a lower contrast, a smaller target, a longer attestation life, and a disabled axe rule', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      axe: { ...base.axe, rules_disabled: ['region'] },
      contrast: { ...base.contrast, text_min: 4.5 },
      criticality: {
        ...base.criticality,
        attestation_days: { C1: 60, C2: 90 },
      },
      target: { ...base.target, min_css_px: 24 },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'ASOT-05', []),
    ).toStrictEqual([
      'contrast.text_min moves from 7 to 4.5, the unsafe direction. Rule ASOT-05.',
      'target.min_css_px moves from 44 to 24, the unsafe direction. Rule ASOT-05.',
      'criticality.attestation_days.C1 moves from 30 to 60, the unsafe direction. Rule ASOT-05.',
      'axe.rules_disabled adds region, the unsafe direction. Rule ASOT-05.',
    ])
  })

  it('passes a lower contrast with an ASOT-05 record for its key', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      contrast: { ...base.contrast, text_min: 4.5 },
    }

    expect(
      safeDirectionProblems(limitsOf(now), limitsOf(base), 'ASOT-05', [
        { place: 'contrast.text_min', rule: 'ASOT-05' },
      ]),
    ).toStrictEqual([])
  })

  it('names an attestation level that the branch deletes', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      criticality: { ...base.criticality, attestation_days: { C2: 90 } },
    }

    expect(removedLevelProblems(now, base, [])).toStrictEqual([
      'criticality.attestation_days.C1 is removed, the unsafe direction. Rule ASOT-05.',
    ])
  })

  it('passes a deleted attestation level with an ASOT-05 record for its key', () => {
    const base = policy()
    const now: Policy = {
      ...base,
      criticality: { ...base.criticality, attestation_days: { C2: 90 } },
    }

    expect(
      removedLevelProblems(now, base, [
        { place: 'criticality.attestation_days.C1', rule: 'ASOT-05' },
      ]),
    ).toStrictEqual([])
  })
})
