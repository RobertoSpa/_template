import {
  type Deviation,
  deviationProblems,
  readDeviations,
} from '../deviations.ts'
import { safeDirectionProblems } from '../directions.ts'
import { type Outcome } from '../gates.ts'
import { baseRef, onBase } from '../git.ts'
import { exists, folders, readText, today } from '../io.ts'
import { POLICY_PATHS } from '../policies.ts'
import { bundlePathsOf, readRecords } from '../routes.ts'
import { identifiersOf, parseRules, unparsedProblems } from '../rules.ts'
import { ADAPTERS_DIR } from './adaptersGate.ts'
import {
  causeProblems,
  dangerProblems,
  identifierProblems,
} from './fileChecks.ts'
import { headerProblems, nonceProblems } from './headerChecks.ts'
import { keyProblems } from './keyChecks.ts'
import {
  gateProblems,
  handlerProblems,
  limitsOf,
  numberProblems,
  routeRecordProblems,
} from './policyChecks.ts'
import { type Policy, problem, type RouteRecord, RULES_PATH } from './shared.ts'
import { egressProblems, workflowProblems } from './workflowChecks.ts'
import assert from 'node:assert'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'

const WORKFLOW_PATH = '.github/workflows/exposure.yml'
const FILES_MAX = 1_000
// JSON holds no comment. The gate adapters guards vercel.json. Rule ESOT-06.
const JSON_EXTENSION = '.json'
const HANDLER_FILE = /\.[cm]?[jt]sx?$/u

const configurationFiles = (policy: Policy): string[] => {
  assert(policy.routes.file.length > 0)
  assert(policy.deviation.file.length > 0)

  const adapters = exists(ADAPTERS_DIR)
    ? readdirSync(ADAPTERS_DIR)
        .filter((name) => !name.endsWith(JSON_EXTENSION))
        .map((name) => join(ADAPTERS_DIR, name))
    : []

  assert(adapters.length <= FILES_MAX)

  return [
    POLICY_PATHS.exposure,
    policy.routes.file,
    policy.deviation.file,
    policy.output.gitleaks_config,
    ...adapters,
  ]
}

const fileProblems = (policy: Policy): string[] => {
  assert(policy.probe.suite.length > 0)
  assert(policy.output.dir.length > 0)

  const paths = [
    policy.probe.suite,
    policy.deviation.file,
    policy.routes.file,
    policy.output.gitleaks_config,
  ]

  return paths
    .filter((path) => !exists(path))
    .map((path) =>
      problem(
        `the policy names ${path} and the file is missing`,
        `Create ${path}`,
        'ESOT-01',
      ),
    )
}

const baseProblems = (
  policy: Policy,
  deviations: Deviation[],
  rulesText: string,
): string[] => {
  assert(policy.version >= 1)
  assert(rulesText.length > 0)

  const ref = baseRef()

  if (ref === undefined) {
    return [
      problem(
        'git has no main and no origin/main to compare with',
        'Fetch origin/main',
        'ESOT-03',
      ),
    ]
  }

  const main = onBase(ref, POLICY_PATHS.exposure)
  const mainRules = onBase(ref, RULES_PATH)

  return [
    ...(main === undefined
      ? []
      : safeDirectionProblems(
          limitsOf(policy),
          limitsOf(parseYaml(main) as Policy),
          'ESOT-03',
          deviations,
        )),
    ...(mainRules === undefined
      ? []
      : identifierProblems(
          identifiersOf([{ file: RULES_PATH, text: rulesText }]),
          identifiersOf([{ file: RULES_PATH, text: mainRules }]),
        )),
  ]
}

const serverProblems = (server: Policy['server']): string[] => {
  assert(server.kind.length > 0)
  assert(server.handlers.length > 0)

  if (server.kind === 'none') {
    return []
  }

  if (!exists(server.authorize)) {
    return [
      problem(
        `server.authorize names ${server.authorize} and the file is missing`,
        `Create ${server.authorize} with the one authorize function`,
        'ROUTE-05',
      ),
    ]
  }

  const names = exists(server.handlers)
    ? readdirSync(server.handlers).filter((name) => HANDLER_FILE.test(name))
    : []

  assert(names.length <= FILES_MAX)
  assert(folders(server.handlers).length <= FILES_MAX)

  return handlerProblems(
    names.map((name) => [
      join(server.handlers, name),
      readText(join(server.handlers, name)),
    ]),
  )
}

export const checkPolicy = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)

  const rulesText = readText(RULES_PATH)
  const rules = parseRules(rulesText)
  const deviations = readDeviations(policy.deviation.file)
  const problems = [
    ...unparsedProblems(rulesText, rules, 'DOC-01'),
    ...causeProblems(rulesText),
    ...gateProblems(policy.gates, policy.live.url),
    ...numberProblems(policy),
    ...headerProblems(policy.headers),
    ...nonceProblems(policy.headers.csp, policy.server.kind),
    ...keyProblems(policy as unknown as Record<string, unknown>),
    ...fileProblems(policy),
    ...(exists(policy.routes.file)
      ? routeRecordProblems(
          readRecords<RouteRecord>(policy.routes.file),
          bundlePathsOf(),
          policy.routes,
          policy.server.kind,
        )
      : []),
    ...serverProblems(policy.server),
    ...dangerProblems(
      configurationFiles(policy)
        .filter((path) => exists(path))
        .map((path) => [path, readText(path)]),
    ),
    ...(exists(WORKFLOW_PATH)
      ? [
          ...workflowProblems(readText(WORKFLOW_PATH)),
          ...egressProblems(readText(WORKFLOW_PATH), policy.live.url),
        ]
      : [
          problem(
            `${WORKFLOW_PATH} is missing`,
            `Create ${WORKFLOW_PATH} with one step, run: pnpm exposure`,
            'ESOT-02',
          ),
        ]),
    ...baseProblems(policy, deviations, rulesText),
    ...deviationProblems(deviations, {
      ids: { expiry: 'EDEV-01', fields: 'EDEV-01', mandatory: 'EDEV-01' },
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
