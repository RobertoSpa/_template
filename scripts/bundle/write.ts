import { type Outcome, readText } from '../a11y/shared.ts'
import {
  type Budget,
  KINDS,
  type Policy,
  POLICY_PATH,
  type Sizes,
} from './shared.ts'
import { measure } from './size.ts'
import { sizesTextOf } from './sizeChecks.ts'
import assert from 'node:assert'
import { writeFileSync } from 'node:fs'
import { parseDocument } from 'yaml'

type Kind = (typeof KINDS)[number]

const loweredOf = (
  budget: Budget,
  used: Budget,
  slackBytes: number,
): Array<[Kind, number]> => {
  assert(slackBytes >= 0)
  assert(used.total >= 0)

  return KINDS.map((kind): [Kind, number] => [
    kind,
    Math.min(budget[kind], used[kind] + slackBytes),
  ]).filter(([kind, lowered]) => lowered < budget[kind])
}

const lowerBudgets = (policy: Policy, sizes: Sizes): string[] => {
  assert(policy.routes.length > 0)
  assert(policy.stage.order.includes(policy.stage.lock_from))

  const document = parseDocument(readText(POLICY_PATH))
  const lockIndex = policy.stage.order.indexOf(policy.stage.lock_from)
  const notes: string[] = []

  for (const [index, route] of policy.routes.entries()) {
    const used = sizes.routes[route.path]

    assert(used !== undefined, `the build gives no size for ${route.path}`)

    if (policy.stage.order.indexOf(route.stage) < lockIndex) {
      continue
    }

    for (const [kind, lowered] of loweredOf(
      route.budget,
      used,
      policy.stage.slack_bytes,
    )) {
      document.setIn(['routes', index, 'budget', kind], lowered)
      notes.push(
        `${route.path} ${kind} budget goes from ${route.budget[kind]} to ${lowered}`,
      )
    }
  }

  if (notes.length > 0) {
    // No padding inside [ ], so the file stays in the format of Prettier.
    writeFileSync(
      POLICY_PATH,
      document.toString({ flowCollectionPadding: false }),
    )
  } else {
    assert(document.errors.length === 0)
  }

  return notes
}

// Rules BSOT-05 and BUD-03. The one writer of bundle/sizes.json and of a smaller budget.
export const writeSizes = async (policy: Policy): Promise<Outcome> => {
  assert(policy.measure.sizes_file.length > 0)

  const measured = measure(policy)

  if (measured.problems.length > 0) {
    return { notes: ['no file written'], problems: measured.problems }
  }

  assert(measured.sizes.total.wire > 0)

  writeFileSync(policy.measure.sizes_file, sizesTextOf(measured.sizes))

  return {
    notes: [
      `${policy.measure.sizes_file} written`,
      ...lowerBudgets(policy, measured.sizes),
    ],
    problems: [],
  }
}
