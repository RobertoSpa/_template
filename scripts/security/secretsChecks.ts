import assert from 'node:assert'

const PATTERNS_MAX = 100

const patternToRegExp = (pattern: string): RegExp => {
  assert(pattern.length > 0)
  assert(!pattern.includes('/'))

  const escaped = pattern.replaceAll(/[.+?^${}()|[\]\\]/gu, String.raw`\$&`)

  return new RegExp(`^${escaped.replaceAll('*', '.*')}$`, 'u')
}

export const secretFileProblems = (
  patterns: string[],
  tracked: string[],
): string[] => {
  assert(patterns.length <= PATTERNS_MAX)
  assert(Array.isArray(tracked))

  const matchers = patterns.map((pattern) => ({
    pattern,
    regExp: patternToRegExp(pattern),
  }))
  const problems: string[] = []

  for (const path of tracked) {
    const base = path.split('/').at(-1) ?? ''
    const hit = matchers.find(({ regExp }) => regExp.test(base))

    if (hit !== undefined) {
      problems.push(
        `${path} matches the secret pattern ${hit.pattern}. Rule SEC-03.`,
      )
    }
  }

  assert(problems.length <= tracked.length)

  return problems
}
