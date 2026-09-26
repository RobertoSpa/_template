import { deviates, type Deviation } from '../deviations.ts'
import { POLICY_PATHS } from '../policies.ts'
import { bytesOf } from './policyChecks.ts'
import { KINDS, type Policy, type Route } from './shared.ts'
import assert from 'node:assert'
import { isDeepStrictEqual } from 'node:util'

type Direction = 'larger' | 'smaller'

const RECORDS_MAX = 1_000
const LEAVES_MAX = 10_000

export const stageDirectionProblems = (
  now: Route[],
  base: Route[],
  order: string[],
): string[] => {
  assert(order.length > 0)
  assert(now.length <= RECORDS_MAX)

  return now.flatMap((route) => {
    const before = base.find((one) => one.path === route.path)

    if (before === undefined) {
      return []
    }

    return order.indexOf(route.stage) < order.indexOf(before.stage)
      ? [
          `${route.path} moves from the stage ${before.stage} back to ${route.stage}. Rule STG-03.`,
        ]
      : []
  })
}

const numbersOf = (policy: Policy): Array<[string, number, Direction]> => {
  assert(policy.stage.order.length > 0)

  const numbers: Array<[string, number, Direction]> = [
    ...bytesOf(policy)
      .filter(([key]) => !key.startsWith('routes '))
      .map(([key, value]): [string, number, Direction] => [
        key,
        value,
        'smaller',
      ]),
    ['deviation.max_days', policy.deviation.max_days, 'smaller'],
    ['growth.review_percent', policy.growth.review_percent, 'smaller'],
    ...Object.entries(policy.stage.margin).map(
      ([stage, percent]): [string, number, Direction] => [
        `stage.margin.${stage}`,
        percent,
        'larger',
      ],
    ),
  ]

  assert(numbers.length > 0)

  return numbers
}

const listsOf = (policy: Policy): Array<[string, string[], Direction]> => {
  assert(Array.isArray(policy.packages.denied))
  assert(Object.keys(policy.files).length > 0)

  return [
    ['packages.denied', policy.packages.denied, 'larger'],
    ['shake.test_patterns', policy.shake.test_patterns, 'larger'],
    ...Object.entries(policy.files).map(
      ([name, group]): [string, string[], Direction] => [
        `files.${name}.allowed_other`,
        group.allowed_other ?? [],
        'smaller',
      ],
    ),
  ]
}

const numberProblems = (now: Policy, base: Policy): string[] => {
  const before = new Map(numbersOf(base).map(([key, value]) => [key, value]))

  assert(before.size > 0)

  return numbersOf(now).flatMap(([key, value, safe]) => {
    const old = before.get(key)

    if (old === undefined || old === value) {
      return []
    }

    const unsafe = safe === 'smaller' ? value > old : value < old

    return unsafe
      ? [
          `${key} moves from ${old} to ${value}, the unsafe direction. Rule BSOT-04.`,
        ]
      : []
  })
}

const listProblems = (now: Policy, base: Policy): string[] => {
  const before = new Map(listsOf(base).map(([key, items]) => [key, items]))

  assert(before.size > 0)

  return listsOf(now).flatMap(([key, items, safe]) => {
    const old = before.get(key) ?? []
    const added = items.filter((item) => !old.includes(item))
    const removed = old.filter((item) => !items.includes(item))
    const unsafe = safe === 'smaller' ? added : removed
    const verb = safe === 'smaller' ? 'adds' : 'removes'

    return unsafe.map(
      (item) => `${key} ${verb} ${item}, the unsafe direction. Rule BSOT-04.`,
    )
  })
}

type Leaf = boolean | null | number | string

// Each leaf of the policy by its dotted key. An array is one leaf.
const leavesOf = (policy: Policy): Map<string, string> => {
  assert(typeof policy === 'object')

  const leaves = new Map<string, string>()
  const queue: Array<[string, Leaf | object]> = Object.entries(policy)

  for (let step = 0; step < LEAVES_MAX && queue.length > 0; step += 1) {
    const [key, value] = queue.pop() ?? ['', null]

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      queue.push(
        ...Object.entries(value).map(
          ([child, leaf]): [string, Leaf | object] => [`${key}.${child}`, leaf],
        ),
      )
    } else {
      leaves.set(key, JSON.stringify(value))
    }
  }

  assert(queue.length === 0, 'the policy has more than LEAVES_MAX keys')

  return leaves
}

// A key with no safe direction does not change with no deviation record.
const fixedKeyProblems = (now: Policy, base: Policy): string[] => {
  const tracked = new Set([
    ...numbersOf(now).map(([key]) => key),
    ...listsOf(now).map(([key]) => key),
  ])
  const before = leavesOf(base)
  const after = leavesOf(now)
  const keys = [...new Set([...before.keys(), ...after.keys()])].toSorted()

  assert(tracked.size > 0)

  return keys
    .filter((key) => !key.startsWith('routes'))
    .filter((key) => !(tracked.has(key) && before.has(key) && after.has(key)))
    .filter((key) => before.get(key) !== after.get(key))
    .map((key) => `${key} changes, and it has no safe direction. Rule BSOT-04.`)
}

export const safeDirectionProblems = (
  now: Policy,
  base: Policy,
  deviations: Deviation[],
): string[] => {
  assert(deviations.length <= RECORDS_MAX)
  assert(base.routes.length > 0)

  const problems = [
    ...numberProblems(now, base),
    ...listProblems(now, base),
    ...fixedKeyProblems(now, base),
  ]

  return problems.filter((problem) => {
    const key = problem.split(' ')[0]

    return !deviates(deviations, 'BSOT-04', key)
  })
}

// The policy with each change that BSOT-03 permits undone, from the routes of base.
const withoutPermittedOf = (
  policy: Policy,
  kept: Route[],
  base: Route[],
): Policy => {
  assert(Array.isArray(kept))
  assert(Array.isArray(base))

  const routes = policy.routes.flatMap((route) => {
    const inBoth = kept.some((one) => one.path === route.path)
    const before = base.find((one) => one.path === route.path)

    return inBoth && before !== undefined
      ? [
          {
            ...route,
            budget: before.budget,
            page: before.page,
            stage: before.stage,
          },
        ]
      : []
  })

  assert(routes.length <= policy.routes.length)

  return { ...policy, routes }
}

const permittedRoute = (route: Route, base: Route[], order: string[]) => {
  assert(order.length > 0)

  const before = base.find((one) => one.path === route.path)

  if (before === undefined) {
    return true
  }

  const forward = order.indexOf(route.stage) >= order.indexOf(before.stage)

  assert(typeof forward === 'boolean')

  return (
    forward && KINDS.every((kind) => route.budget[kind] <= before.budget[kind])
  )
}

export const policyOnlyProblems = (
  changed: string[],
  now: Policy,
  base: Policy,
): string[] => {
  assert(Array.isArray(changed))
  assert(base.routes.length > 0)

  if (!changed.includes(POLICY_PATHS.bundle) || changed.length === 1) {
    return []
  }

  // Each side keeps only the routes of the other, so a removed route is permitted.
  const sameOtherwise = isDeepStrictEqual(
    withoutPermittedOf(now, base.routes, base.routes),
    withoutPermittedOf(base, now.routes, base.routes),
  )
  const permitted = now.routes.every((route) =>
    permittedRoute(route, base.routes, now.stage.order),
  )

  if (sameOtherwise && permitted) {
    return []
  }

  return [
    `the branch changes ${POLICY_PATHS.bundle} and ${changed.length - 1} more files. Only a smaller budget, a new or removed route record, a new page name, and a stage that moves forward can go with other files. Rule BSOT-03.`,
  ]
}
