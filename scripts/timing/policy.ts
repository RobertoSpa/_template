import {
  type Deviation,
  deviationProblems,
  readDeviations,
} from '../deviations.ts'
import { safeDirectionProblems } from '../directions.ts'
import { type Outcome } from '../gates.ts'
import { baseRef, onBase } from '../git.ts'
import { exists, readText, readYaml, today } from '../io.ts'
import { POLICY_PATHS, readPolicy } from '../policies.ts'
import { parseRules, unparsedProblems } from '../rules.ts'
import {
  gateProblems,
  limitsOf,
  numberProblems,
  routeRecordProblems,
  workflowProblems,
} from './policyChecks.ts'
import { type Policy, type RouteRecord, RULES_PATH } from './shared.ts'
import assert from 'node:assert'
import { parse as parseYaml } from 'yaml'

const WORKFLOW_PATH = '.github/workflows/timing.yml'
const RECORDS_MAX = 1_000

// A routes file with only comments parses as null, and it holds no record.
export const readRecords = (path: string): RouteRecord[] => {
  assert(path.endsWith('.yaml'))

  const records = readYaml<null | RouteRecord[]>(path) ?? []

  assert(Array.isArray(records))
  assert(records.length <= RECORDS_MAX)

  return records
}

const bundlePathsOf = (): string[] => {
  const { routes } = readPolicy<{
    gates: string[]
    routes: Array<{ path: string }>
  }>(POLICY_PATHS.bundle)

  assert(Array.isArray(routes))
  assert(routes.every((route) => typeof route.path === 'string'))

  return routes.map((route) => route.path)
}

const fileProblems = (policy: Policy): string[] => {
  assert(policy.lab.suite.length > 0)
  assert(policy.deviation.file.length > 0)

  const paths = [policy.lab.suite, policy.deviation.file, policy.routes.file]

  return paths
    .filter((path) => !exists(path))
    .map(
      (path) =>
        `the policy names ${path} and the file is missing. Rule TSOT-01.`,
    )
}

const directionProblems = (
  policy: Policy,
  deviations: Deviation[],
): string[] => {
  assert(policy.version >= 1)
  assert(Array.isArray(deviations))

  const ref = baseRef()

  if (ref === undefined) {
    return ['git has no main and no origin/main to compare with. Rule TSOT-03.']
  }

  const main = onBase(ref, POLICY_PATHS.timing)

  if (main === undefined) {
    return []
  }

  return safeDirectionProblems(
    limitsOf(policy),
    limitsOf(parseYaml(main) as Policy),
    'TSOT-03',
    deviations,
  )
}

export const checkPolicy = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)

  const rulesText = readText(RULES_PATH)
  const rules = parseRules(rulesText)
  const deviations = readDeviations(policy.deviation.file)
  const problems = [
    ...unparsedProblems(rulesText, rules, 'DOC-01'),
    ...gateProblems(policy.gates),
    ...numberProblems(policy),
    ...fileProblems(policy),
    ...(exists(policy.routes.file)
      ? routeRecordProblems(readRecords(policy.routes.file), bundlePathsOf())
      : []),
    ...(exists(WORKFLOW_PATH)
      ? workflowProblems(readText(WORKFLOW_PATH))
      : [`${WORKFLOW_PATH} is missing. Rule TSOT-02.`]),
    ...directionProblems(policy, deviations),
    ...deviationProblems(deviations, {
      ids: { expiry: 'TDEV-01', fields: 'TDEV-01', mandatory: 'TDEV-01' },
      maxDays: policy.deviation.max_days,
      rules,
      todayIso: today(),
    }),
  ]

  assert(rules.length > 0)

  return {
    notes: [
      `${rules.length} rules read`,
      `${deviations.length} deviations read`,
    ],
    problems,
  }
}
