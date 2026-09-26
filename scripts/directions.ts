import { deviates, type Deviation } from './deviations.ts'
import assert from 'node:assert'

export type Direction = 'larger' | 'smaller'

// Each policy value that has a safe direction, by its dotted key.
export type Limits = {
  lists: Array<[string, string[], Direction]>
  numbers: Array<[string, number, Direction]>
}

const RECORDS_MAX = 1_000

const numberProblems = (now: Limits, base: Limits, rule: string): string[] => {
  const before = new Map(base.numbers.map(([key, value]) => [key, value]))

  assert(before.size > 0)
  assert(rule.length > 0)

  return now.numbers.flatMap(([key, value, safe]) => {
    const old = before.get(key)

    if (old === undefined || old === value) {
      return []
    }

    const unsafe = safe === 'smaller' ? value > old : value < old

    return unsafe
      ? [
          `${key} moves from ${old} to ${value}, the unsafe direction. Rule ${rule}.`,
        ]
      : []
  })
}

const listProblems = (now: Limits, base: Limits, rule: string): string[] => {
  const before = new Map(base.lists.map(([key, items]) => [key, items]))

  assert(before.size <= base.lists.length)
  assert(rule.length > 0)

  return now.lists.flatMap(([key, items, safe]) => {
    const old = before.get(key) ?? []
    const added = items.filter((item) => !old.includes(item))
    const removed = old.filter((item) => !items.includes(item))
    const unsafe = safe === 'smaller' ? added : removed
    const verb = safe === 'smaller' ? 'adds' : 'removes'

    return unsafe.map(
      (item) => `${key} ${verb} ${item}, the unsafe direction. Rule ${rule}.`,
    )
  })
}

export const safeDirectionProblems = (
  now: Limits,
  base: Limits,
  rule: string,
  deviations: Deviation[],
): string[] => {
  assert(deviations.length <= RECORDS_MAX)
  assert(now.numbers.length > 0)

  const problems = [
    ...numberProblems(now, base, rule),
    ...listProblems(now, base, rule),
  ]

  return problems.filter((problem) => {
    const key = problem.split(' ')[0]

    return !deviates(deviations, rule, key)
  })
}
