import { exists, type Outcome } from '../a11y/shared.ts'
import { execute, tail } from '../security/shared.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'

const PLAYWRIGHT_ARGS = ['exec', 'playwright', 'test']

export const checkFault = (policy: Policy): Outcome => {
  assert(policy.fault.suite.length > 0)
  assert(policy.fault.cases.length > 0)

  if (!exists(policy.fault.suite)) {
    return {
      notes: [],
      problems: [
        `the fault suite ${policy.fault.suite} is missing. Rule FIT-01.`,
      ],
    }
  }

  const run = execute('pnpm', [...PLAYWRIGHT_ARGS, policy.fault.suite])

  assert(typeof run.status === 'number')

  if (run.status === 0) {
    return { notes: [`${policy.fault.suite} passed`], problems: [] }
  }

  return {
    notes: [],
    problems: [
      `${policy.fault.suite} failed with the status ${run.status}. Rule FIT-01.`,
      ...tail(run.output),
    ],
  }
}
