import { type Outcome } from '../gates.ts'
import { exists, readText } from '../io.ts'
import { readRecords } from '../routes.ts'
import { runSuite, type SuiteRunKind } from '../suite.ts'
import { headerSetOf } from './headers.ts'
import { reportProblems } from './probeChecks.ts'
import {
  type ManifestEntry,
  type Policy,
  problem,
  type Report,
  type RouteRecord,
} from './shared.ts'
import assert from 'node:assert'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const TARGET_PATH = 'reports/exposure/target.json'
// The one action of each way that the suite run can go wrong. Rule ESOT-08.
const ACTION_OF: Record<Exclude<SuiteRunKind, 'passed'>, string> = {
  failed: 'Read the lines below and make the server answer',
  missing: 'Create the suite that probe.suite names',
  no_report: 'Make the suite write one probe per response',
}

const judge = (policy: Policy, url: string): Outcome => {
  assert(policy.probe.report.length > 0)
  assert(typeof url === 'string')

  if (!exists(policy.output.manifest)) {
    return {
      notes: [],
      problems: [
        problem(
          `${policy.output.manifest} is missing`,
          'Run pnpm exposure output first',
          'PROBE-01',
        ),
      ],
    }
  }

  mkdirSync(dirname(TARGET_PATH), { recursive: true })
  writeFileSync(TARGET_PATH, `${JSON.stringify({ url })}\n`, 'utf8')

  const run = runSuite(policy.probe.suite, policy.probe.report)

  if (run.kind !== 'passed') {
    return {
      notes: [],
      problems: [
        problem(run.summary, ACTION_OF[run.kind], 'PROBE-01'),
        ...run.output,
      ],
    }
  }

  const report = JSON.parse(readText(policy.probe.report)) as Report

  assert(Array.isArray(report.probes))

  return {
    notes: [
      'the webServer of playwright.config.ts built the output a second time with pnpm build:dist',
      `${report.probes.length} probes against ${url.length > 0 ? url : 'the preview server'}`,
    ],
    problems: reportProblems(
      report,
      headerSetOf(policy.headers),
      readRecords<RouteRecord>(policy.routes.file),
      policy,
      JSON.parse(readText(policy.output.manifest)) as ManifestEntry[],
    ),
  }
}

// Rule PROBE-01. The suite records, and this gate judges.
export const checkProbe = (policy: Policy): Outcome => judge(policy, '')

// Rule PROBE-03. The same suite against the deployed URL.
export const checkLive = (policy: Policy): Outcome => {
  assert(typeof policy.live.url === 'string')
  assert(policy.gates.length > 0)

  if (policy.live.url.length === 0) {
    return {
      notes: [],
      problems: [
        problem(
          'live.url is empty',
          'Set live.url to the deployed URL and add live to gates',
          'PROBE-03',
        ),
      ],
    }
  }

  return judge(policy, policy.live.url.replace(/\/$/u, ''))
}
