import { deviationProblems, readDeviations } from '../deviations.ts'
import { type Outcome } from '../gates.ts'
import { baseRef, onBase } from '../git.ts'
import { exists, readText, today } from '../io.ts'
import { POLICY_PATHS } from '../policies.ts'
import { parseRules, unparsedProblems } from '../rules.ts'
import {
  codeRemovalProblems,
  codesOf,
  constantProblems,
  fallbackProblems,
  messageProblems,
  safeDirectionProblems,
} from './policyChecks.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'
import { parse as parseYaml } from 'yaml'

const RULES_PATH = 'docs/agents/resilience.md'
const INDEX_PATH = 'index.html'
const TIMEOUT_CALL = 'AbortSignal.timeout(TIMEOUT_MS)'

const onMain = (path: string): string | undefined => {
  assert(path.length > 0)

  const ref = baseRef()

  return ref === undefined ? undefined : onBase(ref, path)
}

const recordFilesProblems = (policy: Policy): string[] => {
  assert(policy.routes.file.length > 0)
  assert(policy.deviation.file.length > 0)

  const paths = [
    policy.boundary.file,
    policy.detection.reporter,
    policy.deviation.file,
    policy.error.file,
    policy.error.parser,
    policy.error.result_file,
    policy.fault.suite,
    policy.network.client,
    policy.routes.file,
  ]

  return paths
    .filter((path) => !exists(path))
    .map(
      (path) =>
        `the policy names ${path} and the file is missing. Rule RSOT-01.`,
    )
}

const nativeProblems = (policy: Policy): string[] => {
  assert(policy.network.timeout_ms > 0)
  assert(policy.boundary.max_resets >= 0)

  const client = readText(policy.network.client)
  const problems = [
    ...constantProblems(client, policy.network.client, {
      BACKOFF_BASE_MS: policy.network.backoff_base_ms,
      RETRY_BUDGET_PER_TAB: policy.network.retry_budget_per_tab,
      RETRY_MAX: policy.network.retry_max,
      RETRY_METHODS: policy.network.retry_methods,
      TIMEOUT_MS: policy.network.timeout_ms,
    }),
    ...constantProblems(readText(policy.boundary.file), policy.boundary.file, {
      RESETS_MAX: policy.boundary.max_resets,
    }),
    ...fallbackProblems(
      readText(INDEX_PATH),
      policy.boundary.fallback_text,
      policy.boundary.fallback_delay_ms,
    ),
  ]

  if (!client.includes(TIMEOUT_CALL)) {
    problems.push(
      `${policy.network.client} does not call ${TIMEOUT_CALL}. Rule NET-01.`,
    )
  }

  return problems
}

const codeProblems = (policy: Policy): string[] => {
  assert(policy.error.file.length > 0)

  const now = readText(policy.error.file)
  const main = onMain(policy.error.file)
  const problems = messageProblems(now)

  if (main !== undefined) {
    problems.push(...codeRemovalProblems(codesOf(now), codesOf(main)))
  }

  return problems
}

const directionProblems = (policy: Policy): string[] => {
  assert(policy.version >= 1)

  const main = onMain(POLICY_PATHS.resilience)

  if (main === undefined) {
    return []
  }

  return safeDirectionProblems(policy, parseYaml(main) as Policy)
}

export const checkPolicy = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)

  const rulesText = readText(RULES_PATH)
  const rules = parseRules(rulesText)
  const deviations = readDeviations(policy.deviation.file)
  const problems = [
    ...unparsedProblems(rulesText, rules, 'DOC-01'),
    ...recordFilesProblems(policy),
    ...nativeProblems(policy),
    ...codeProblems(policy),
    ...directionProblems(policy),
    ...deviationProblems(deviations, {
      ids: { expiry: 'RDEV-01', fields: 'RDEV-01', mandatory: 'RDEV-01' },
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
