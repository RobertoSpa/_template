import { liveDeviations, readDeviations } from '../deviations.ts'
import { type Outcome } from '../gates.ts'
import { readText, today } from '../io.ts'
import { readRecords } from '../routes.ts'
import { runSuite } from '../suite.ts'
import { labOutcome } from './labChecks.ts'
import { type Policy, type Report, type RouteRecord } from './shared.ts'
import assert from 'node:assert'

// Rule LAB-01. The suite measures, and this gate judges.
export const checkLab = (policy: Policy): Outcome => {
  assert(policy.lab.suite.length > 0)
  assert(policy.lab.report.length > 0)

  const run = runSuite(policy.lab.suite, policy.lab.report)

  if (run.kind !== 'passed') {
    return {
      notes: [],
      problems: [`${run.summary}. Rule LAB-01.`, ...run.output],
    }
  }

  const report = JSON.parse(readText(policy.lab.report)) as Report

  assert(typeof report.routes === 'object')

  return labOutcome(
    report,
    readRecords<RouteRecord>(policy.routes.file),
    policy,
    liveDeviations(readDeviations(policy.deviation.file), today()),
  )
}
