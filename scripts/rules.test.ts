import {
  citationProblems,
  collisionProblems,
  identifiersOf,
  isIdentifier,
  parseRules,
  ruleLinesOf,
  unparsedProblems,
} from './rules.ts'
import { describe, expect, it } from 'vitest'

const SOURCES = [
  {
    file: 'docs/agents/accessibility.md',
    text: [
      '- **SOT-01 (M, proven, project).** The accessibility rule.',
      '- **DEV-01 (M, proven, project).** The accessibility deviation rule.',
      '',
    ].join('\n'),
  },
  {
    file: 'docs/agents/security.md',
    text: [
      '- **SOT-01 (M).** The security rule.',
      '- **DEP-01 (M).** The dependency rule.',
      '',
    ].join('\n'),
  },
]

describe('collisionProblems', () => {
  it('refuses an identifier that two rule files hold', () => {
    expect(collisionProblems(SOURCES, 'DOC-03')).toStrictEqual([
      'SOT-01 is a rule of docs/agents/accessibility.md and docs/agents/security.md. Give the subsequent file its own prefix. Rule DOC-03.',
    ])
  })

  it('passes identifiers that one rule file holds each', () => {
    expect(collisionProblems([SOURCES[1]], 'DOC-03')).toStrictEqual([])
  })
})

describe('isIdentifier', () => {
  it.each([
    ['DEP-01', true],
    ['COLOR-07', true],
    ['dep-01', false],
    ['DEP-1', false],
    ['DEP-100', false],
    ['DEP', false],
    ['', false],
  ])('reads %s as %s', (value, wanted) => {
    expect(isIdentifier(value)).toBe(wanted)
  })
})

describe('ruleLinesOf', () => {
  it('gives one line for an identifier of one file', () => {
    expect(ruleLinesOf(SOURCES, 'DEP-01')).toStrictEqual([
      {
        file: 'docs/agents/security.md',
        line: '- **DEP-01 (M).** The dependency rule.',
      },
    ])
  })

  it('gives two lines for an identifier that the two files hold', () => {
    expect(
      ruleLinesOf(SOURCES, 'SOT-01').map((found) => found.file),
    ).toStrictEqual(['docs/agents/accessibility.md', 'docs/agents/security.md'])
  })

  it('gives no line for an identifier that no file holds', () => {
    expect(ruleLinesOf(SOURCES, 'NOPE-99')).toStrictEqual([])
  })
})

describe('identifiersOf', () => {
  it('gives each identifier of the two files one time', () => {
    expect([...identifiersOf(SOURCES)].toSorted()).toStrictEqual([
      'DEP-01',
      'DEV-01',
      'SOT-01',
    ])
  })
})

describe('citationProblems', () => {
  const known = new Set(['DEP-01', 'DEV-01', 'SOT-01'])

  it('gives no problem for a citation that names a rule', () => {
    const citing = [
      { file: 'scripts/deps.ts', text: 'the line. Rule DEP-01.\n' },
    ]

    expect(citationProblems(citing, known, 'DOC-02')).toStrictEqual([])
  })

  it('names the file and the line of a citation that no rule holds', () => {
    const citing = [
      { file: 'scripts/deps.ts', text: 'first\nthe line. Rule DEP-99.\n' },
    ]

    expect(citationProblems(citing, known, 'DOC-02')).toStrictEqual([
      'scripts/deps.ts line 2 names DEP-99, and no rule file holds it. Rule DOC-02.',
    ])
  })

  it('gives one problem for each stale citation on one line', () => {
    const citing = [
      { file: 'docs/note.md', text: 'Rule DEP-99 and Rule KEY-98.\n' },
    ]

    expect(citationProblems(citing, known, 'DOC-02')).toHaveLength(2)
  })
})

describe('parseRules', () => {
  const rulesText = [
    '- **SOT-01 (M, proven).** The security shape, with two fields.',
    '- **REPO-05 (A, proven, public only).** The security shape, with a qualifier.',
    '- **COLOR-02 (M, attested, WCAG 1.4.3 + 1.4.6).** The accessibility shape.',
    '- **DEV-01 (R, impossible, project).** The accessibility shape of the project.',
    '',
  ].join('\n')

  it('reads the two-field shape of the security file', () => {
    expect(parseRules(rulesText)[0]).toStrictEqual({
      category: 'M',
      criteria: [],
      id: 'SOT-01',
      layer: 'proven',
    })
  })

  it('gives no criterion for a third field that names no criterion', () => {
    expect(parseRules(rulesText)[1].criteria).toStrictEqual([])
  })

  it('gives each criterion of the third field', () => {
    expect(parseRules(rulesText)[2].criteria).toStrictEqual(['1.4.3', '1.4.6'])
  })

  it('gives the category and the layer of each rule', () => {
    const shapes = parseRules(rulesText).map(
      (rule) => `${rule.category} ${rule.layer}`,
    )

    expect(shapes).toStrictEqual([
      'M proven',
      'A proven',
      'M attested',
      'R impossible',
    ])
  })
})

describe('unparsedProblems', () => {
  it('gives no problem when each rule bullet parses', () => {
    const rulesText = '- **SOT-01 (M, proven).** The rule.\n'

    expect(
      unparsedProblems(rulesText, parseRules(rulesText), 'DOC-01'),
    ).toStrictEqual([])
  })

  it('counts a rule bullet that names no layer', () => {
    const rulesText = [
      '- **SOT-01 (M, proven).** The rule.',
      '- **SOT-02 (M).** The rule with no layer.',
      '',
    ].join('\n')

    expect(
      unparsedProblems(rulesText, parseRules(rulesText), 'DOC-01'),
    ).toHaveLength(1)
  })
})
