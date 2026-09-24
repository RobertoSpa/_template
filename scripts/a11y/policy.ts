import { deviationProblems, readDeviations } from '../deviations.ts'
import { parseRules, type Rule, RULE_FILES } from '../rules.ts'
import {
  ambiguousWordProblems,
  type Policy,
  ruleShapeProblems,
  traceabilityProblems,
} from './policyChecks.ts'
import { exists, type Outcome, readText, today } from './shared.ts'
import assert from 'node:assert'

const RULES_PATH = 'docs/agents/accessibility.md'
const ESLINT_PATH = 'eslint-rules/accessibilityConfig.js'
const PACKAGE_PATH = 'package.json'
const POLICY_PATH = 'a11y/policy.yaml'
const UPDATE_FLAGS = ['--update-snapshots', '--update-snapshot']

const recordFilesProblems = (policy: Policy): string[] => {
  assert(policy.deviation.file.length > 0)
  assert(policy.tokens.file.length > 0)

  const paths = [
    policy.attestation.file,
    policy.criticality.file,
    policy.deviation.file,
    policy.tokens.file,
  ]
  const problems: string[] = []

  for (const path of paths) {
    if (!exists(path)) {
      problems.push(
        `the policy names ${path} and the file is missing. Rule ASOT-01.`,
      )
    }
  }

  return problems
}

const goldenFlagProblems = (policy: Policy): string[] => {
  assert(typeof policy.golden.update_flag_allowed === 'boolean')

  const problems: string[] = []

  if (policy.golden.update_flag_allowed) {
    return problems
  }

  const scripts = readText(PACKAGE_PATH)

  for (const flag of UPDATE_FLAGS) {
    if (scripts.includes(flag)) {
      problems.push(
        `${PACKAGE_PATH} holds the flag ${flag}. A tool must not write a golden file. Rule EV-01.`,
      )
    }
  }

  assert(problems.length <= UPDATE_FLAGS.length)

  return problems
}

const eslintProblems = (policy: Policy): string[] => {
  assert(policy.eslint_jsx_a11y.length > 0)

  const problems: string[] = []
  const config = readText(ESLINT_PATH)

  if (!config.includes(POLICY_PATH)) {
    problems.push(
      `${ESLINT_PATH} does not read ${POLICY_PATH}. The policy is the one source of the rule list. Rule ASOT-03.`,
    )
  }

  assert(problems.length <= 1)

  return problems
}

const rulesProblems = (
  policy: Policy,
  rules: Rule[],
  rulesText: string,
): string[] => {
  assert(rules.length > 0)
  assert(rulesText.length > 0)

  const deviations = readDeviations(policy.deviation.file)

  assert(Array.isArray(deviations))

  return [
    ...ruleShapeProblems(rulesText, rules, policy.layer.names),
    ...RULE_FILES.flatMap((file) =>
      ambiguousWordProblems(readText(file), policy.ambiguous_words).map(
        (problem) => `${file} ${problem}`,
      ),
    ),
    ...traceabilityProblems(rules, policy.conformance),
    ...deviationProblems(deviations, {
      ids: { expiry: 'ADEV-03', fields: 'ADEV-01', mandatory: 'ADEV-02' },
      maxDays: policy.deviation.max_days,
      rules,
      todayIso: today(),
    }),
  ]
}

export const checkPolicy = (policy: Policy): Outcome => {
  assert(Array.isArray(policy.gates))
  assert(policy.layer.names.length > 0)

  const missing = recordFilesProblems(policy)

  if (missing.length > 0) {
    return { notes: [], problems: missing }
  }

  const rulesText = readText(RULES_PATH)
  const rules = parseRules(rulesText)
  const problems = [
    ...rulesProblems(policy, rules, rulesText),
    ...goldenFlagProblems(policy),
    ...eslintProblems(policy),
  ]

  assert(rules.length > 0)

  return {
    notes: [
      `${rules.length} rules, ${policy.conformance.base_criteria.length + policy.conformance.adopted_aaa.length} criteria in scope`,
    ],
    problems,
  }
}
