import { type Outcome } from '../gates.ts'
import { runSuite } from '../suite.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'

export const checkFault = (policy: Policy): Outcome => {
  assert(policy.fault.suite.length > 0)
  assert(policy.fault.cases.length > 0)

  const run = runSuite(policy.fault.suite, undefined)

  if (run.kind === 'passed') {
    return { notes: [run.summary], problems: [] }
  }

  return {
    notes: [],
    problems: [`${run.summary}. Rule FIT-01.`, ...run.output],
  }
}
