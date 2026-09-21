import {
  contrastRatio,
  minimumFor,
  pairProblems,
  targetProblems,
  type Tokens,
} from './tokensChecks.ts'
import { describe, expect, it } from 'vitest'

const MINIMUMS = { large_text_min: 4.5, non_text_min: 3, text_min: 7 }

const tokensWith = (foreground: string, kind: string): Tokens => ({
  duration_ms: { normal: 200 },
  pairs: [{ background: 'surface', foreground: 'ink', kind, theme: 'light' }],
  space: { '1': 4 },
  target: { comfortable: 48, minimum: 44 },
  themes: { light: { ink: foreground, surface: '#ffffff' } },
})

describe('contrastRatio', () => {
  it.each([
    {
      first: '#ffffff',
      name: 'black on white is the highest ratio',
      second: '#000000',
      want: 21,
    },
    {
      first: '#ffffff',
      name: 'one color on itself is the lowest ratio',
      second: '#ffffff',
      want: 1,
    },
    {
      first: '#18181b',
      name: 'the light text token on the light surface',
      second: '#ffffff',
      want: 17.72,
    },
    {
      first: '#71717a',
      name: 'the border token on the light surface',
      second: '#ffffff',
      want: 4.83,
    },
  ])('$name', ({ first, second, want }) => {
    expect(contrastRatio(first, second)).toBeCloseTo(want, 2)
  })

  it('gives the same ratio when the two colors change place', () => {
    expect(contrastRatio('#18181b', '#ffffff')).toBe(
      contrastRatio('#ffffff', '#18181b'),
    )
  })
})

describe('minimumFor', () => {
  it.each([
    { kind: 'text', want: 7 },
    { kind: 'large_text', want: 4.5 },
    { kind: 'non_text', want: 3 },
    { kind: 'decorative', want: 0 },
  ])('gives $want for the kind $kind', ({ kind, want }) => {
    expect(minimumFor(kind, MINIMUMS)).toBe(want)
  })
})

describe('pairProblems', () => {
  it('finds no problem when the pair is above the minimum', () => {
    expect(pairProblems(tokensWith('#18181b', 'text'), MINIMUMS)).toStrictEqual(
      [],
    )
  })

  it('names the rule when a text pair is below the minimum', () => {
    const problems = pairProblems(tokensWith('#71717a', 'text'), MINIMUMS)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule COLOR-02')
    expect(problems[0]).toContain('4.83 to 1')
  })

  it('accepts the same color when the pair is not text', () => {
    expect(
      pairProblems(tokensWith('#71717a', 'non_text'), MINIMUMS),
    ).toStrictEqual([])
  })

  it('accepts a pair that is exactly the minimum', () => {
    const exact = { large_text_min: 4.5, non_text_min: 3, text_min: 21 }

    expect(pairProblems(tokensWith('#000000', 'text'), exact)).toStrictEqual([])
  })

  it('refuses a pair one step below the minimum', () => {
    const above = { large_text_min: 4.5, non_text_min: 3, text_min: 21.000_001 }
    const problems = pairProblems(tokensWith('#000000', 'text'), above)

    expect(problems).toHaveLength(1)
  })

  it('reports a kind that the policy does not hold', () => {
    const problems = pairProblems(tokensWith('#18181b', 'decorative'), MINIMUMS)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('decorative')
  })

  it('reports a token that the theme does not hold', () => {
    const tokens = tokensWith('#18181b', 'text')
    const missing = { ...tokens, themes: { light: { surface: '#ffffff' } } }
    const problems = pairProblems(missing, MINIMUMS)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('names a token that the themes do not hold')
  })
})

describe('targetProblems', () => {
  it('accepts a target that is exactly the minimum', () => {
    expect(targetProblems(tokensWith('#18181b', 'text'), 44)).toStrictEqual([])
  })

  it('refuses a target one pixel below the minimum', () => {
    const problems = targetProblems(tokensWith('#18181b', 'text'), 45)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule SIZE-01')
  })
})
