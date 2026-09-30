import { liveDeviations, readDeviations } from '../deviations.ts'
import { type Outcome } from '../gates.ts'
import { execute, exists, readText, tail, today } from '../io.ts'
import { labOutcome } from './labChecks.ts'
import { readRecords } from './policy.ts'
import { type Policy, type Report } from './shared.ts'
import assert from 'node:assert'

const PLAYWRIGHT_ARGS = ['exec', 'playwright', 'test']

// Rule LAB-01. The suite measures, and this gate judges.
export const checkLab = (policy: Policy): Outcome => {
  assert(policy.lab.suite.length > 0)
  assert(policy.lab.report.length > 0)

  if (!exists(policy.lab.suite)) {
    return {
      notes: [],
      problems: [`the suite ${policy.lab.suite} is missing. Rule LAB-01.`],
    }
  }

  const run = execute('pnpm', [...PLAYWRIGHT_ARGS, policy.lab.suite])

  assert(typeof run.status === 'number')

  if (run.status !== 0) {
    return {
      notes: [],
      problems: [
        `${policy.lab.suite} failed with the status ${run.status}. Rule LAB-01.`,
        ...tail(run.output),
      ],
    }
  }

  if (!exists(policy.lab.report)) {
    return {
      notes: [],
      problems: [
        `${policy.lab.suite} passed and wrote no ${policy.lab.report}. Rule LAB-01.`,
      ],
    }
  }

  const report = JSON.parse(readText(policy.lab.report)) as Report

  assert(typeof report.routes === 'object')

  return labOutcome(
    report,
    readRecords(policy.routes.file),
    policy,
    liveDeviations(readDeviations(policy.deviation.file), today()),
  )
}
