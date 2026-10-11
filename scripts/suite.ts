import { execute, exists, tail } from './io.ts'
import assert from 'node:assert'

// One run of a Playwright suite. summary is one sentence with no rule, and the caller adds the rule.
export type SuiteRun = { kind: SuiteRunKind; output: string[]; summary: string }
export type SuiteRunKind = 'failed' | 'missing' | 'no_report' | 'passed'

const PLAYWRIGHT_ARGS = ['exec', 'playwright', 'test']

export const runSuite = (
  suite: string,
  report: string | undefined,
): SuiteRun => {
  assert(suite.length > 0)
  assert(report === undefined || report.length > 0)

  if (!exists(suite)) {
    return {
      kind: 'missing',
      output: [],
      summary: `the suite ${suite} is missing`,
    }
  }

  const run = execute('pnpm', [...PLAYWRIGHT_ARGS, suite])

  if (run.status !== 0) {
    return {
      kind: 'failed',
      output: tail(run.output),
      summary: `${suite} failed with the status ${run.status}`,
    }
  }

  if (report !== undefined && !exists(report)) {
    return {
      kind: 'no_report',
      output: [],
      summary: `${suite} passed and wrote no ${report}`,
    }
  }

  return { kind: 'passed', output: [], summary: `${suite} passed` }
}
