import { parseRules } from '../rules.ts'
import {
  ambiguousWordProblems,
  criteriaInScope,
  ruleShapeProblems,
  traceabilityProblems,
} from './policyChecks.ts'
import { describe, expect, it } from 'vitest'

const CONFORMANCE = {
  adopted_aaa: ['1.4.6'],
  base_criteria: ['1.1.1', '4.1.1', '4.1.2'],
  obsolete: ['4.1.1'],
}

const RULES_TEXT = [
  '# Rules',
  '',
  '- **ASOT-01 (M, proven, project).** The one entry point. Cause: one. Test: one.',
  '- **NAME-01 (M, proven, WCAG 1.1.1).** Each image has a text alternative. Cause: one. Test: one.',
  '- **COLOR-02 (R, attested, WCAG 1.4.6 + 4.1.2).** The pair obeys the minimum. Cause: one. Test: one.',
].join('\n')

describe('parseRules', () => {
  it('reads the identifier, the category, the layer, and the criteria', () => {
    const rules = parseRules(RULES_TEXT)

    expect(rules).toHaveLength(3)
    expect(rules[1]).toStrictEqual({
      category: 'M',
      criteria: ['1.1.1'],
      id: 'NAME-01',
      layer: 'proven',
    })
  })

  it('gives a rule of the project no criteria', () => {
    expect(parseRules(RULES_TEXT)[0].criteria).toStrictEqual([])
  })

  it('reads two criteria from one rule', () => {
    expect(parseRules(RULES_TEXT)[2].criteria).toStrictEqual(['1.4.6', '4.1.2'])
  })
})

describe('ruleShapeProblems', () => {
  it('finds no problem in a document that parses', () => {
    const rules = parseRules(RULES_TEXT)

    expect(
      ruleShapeProblems(RULES_TEXT, rules, ['attested', 'proven']),
    ).toStrictEqual([])
  })

  it('names a layer that the policy does not hold', () => {
    const rules = parseRules(RULES_TEXT)
    const problems = ruleShapeProblems(RULES_TEXT, rules, ['proven'])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('attested')
  })

  it('counts a rule line that does not parse', () => {
    const broken = `${RULES_TEXT}\n- **KEY-99 the shape has no category.**`
    const problems = ruleShapeProblems(broken, parseRules(broken), [
      'attested',
      'proven',
    ])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('1 bullet lines do not parse')
  })
})

describe('criteriaInScope', () => {
  it('holds the base criteria and the adopted AAA criteria', () => {
    expect(criteriaInScope(CONFORMANCE)).toStrictEqual([
      '1.1.1',
      '1.4.6',
      '4.1.2',
    ])
  })
})

describe('traceabilityProblems', () => {
  it('finds no orphan when each criterion has a rule', () => {
    expect(
      traceabilityProblems(parseRules(RULES_TEXT), CONFORMANCE),
    ).toStrictEqual([])
  })

  it('names a criterion in the scope that no rule holds up', () => {
    const wider = { ...CONFORMANCE, base_criteria: ['1.1.1', '2.4.7', '4.1.2'] }
    const problems = traceabilityProblems(parseRules(RULES_TEXT), wider)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(
      'WCAG 2.4.7 is in the scope and no rule names it',
    )
  })

  it('names a criterion that a rule holds up and the scope does not hold', () => {
    const narrower = { ...CONFORMANCE, adopted_aaa: [] }
    const problems = traceabilityProblems(parseRules(RULES_TEXT), narrower)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('WCAG 1.4.6 is named by a rule')
  })
})

describe('ambiguousWordProblems', () => {
  it('finds no problem when no rule holds a word of the list', () => {
    expect(ambiguousWordProblems(RULES_TEXT, ['robust'])).toStrictEqual([])
  })

  it('names the rule that holds a word that no person can test', () => {
    const text = '- **KEY-01 (M, proven, project).** The key map is robust.'
    const problems = ambiguousWordProblems(text, ['robust'])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule ASOT-07')
  })

  it('reads a word of the list in any case', () => {
    const text = '- **KEY-01 (M, proven, project).** The map is ROBUST.'

    expect(ambiguousWordProblems(text, ['robust'])).toHaveLength(1)
  })

  it('leaves a word that only holds the list word inside it', () => {
    const text = '- **KEY-01 (M, proven, project).** The robustness is high.'

    expect(ambiguousWordProblems(text, ['robust'])).toStrictEqual([])
  })
})
