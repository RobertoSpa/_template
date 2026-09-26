import { deviationProblems, readDeviations } from '../deviations.ts'
import { type Outcome } from '../gates.ts'
import { trackedFiles } from '../git.ts'
import { exists, readText, readYaml, today } from '../io.ts'
import {
  citationProblems,
  collisionProblems,
  identifiersOf,
  parseRules,
  RULE_FILES,
  type RuleSource,
  unparsedProblems,
} from '../rules.ts'
import {
  type AcceptedVulnerability,
  acceptedVulnerabilityProblems,
  binaryArtifactProblems,
  type Dependabot,
  dependabotProblems,
  type Policy,
  type Workspace,
  workspaceProblems,
} from './policyChecks.ts'
import assert from 'node:assert'
import { parse as parseToml } from 'smol-toml'

const RULES_PATH = 'docs/agents/security.md'
// The file that tests the citation check holds citations of rules that do not
// exist. Every other tracked file is read.
const FIXTURE_PATH = 'scripts/rules.test.ts'
const CITED_EXTENSIONS = ['.md', '.ts', '.py', '.yaml', '.yml']
const CITED_FILES_MAX = 10_000
const WORKSPACE_PATH = 'pnpm-workspace.yaml'
const DEPENDABOT_PATH = '.github/dependabot.yml'
const FORBIDDEN_IGNORE_FILES = [
  '.trivyignore',
  '.trivyignore.yaml',
  '.snyk',
  '.grype.yaml',
  '.gitleaksignore',
  '.semgrepignore',
]
const ACCEPTED_MAX = 1_000

type AcceptFile = {
  IgnoredVulns?: Array<{
    id: string
    ignoreUntil?: Date | string
    reason?: string
  }>
}

const isoDate = (value: Date | string | undefined): string | undefined => {
  assert(
    value === undefined || typeof value === 'string' || value instanceof Date,
  )

  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value

  assert(text === undefined || text.length === 10)

  return text
}

const acceptedVulnerabilities = (path: string): AcceptedVulnerability[] => {
  assert(path.endsWith('.toml'))

  if (!exists(path)) {
    return []
  }

  const file = parseToml(readText(path)) as AcceptFile
  const entries = (file.IgnoredVulns ?? []).map((entry) => ({
    id: entry.id,
    ignoreUntil: isoDate(entry.ignoreUntil),
    reason: entry.reason,
  }))

  assert(entries.length <= ACCEPTED_MAX)

  return entries
}

const forbiddenIgnoreFileProblems = (): string[] => {
  const present = FORBIDDEN_IGNORE_FILES.filter((path) => exists(path))

  assert(present.length <= FORBIDDEN_IGNORE_FILES.length)

  return present.map(
    (path) => `${path} exists, the one accept file is osv-scanner.toml`,
  )
}

const isCitedFile = (path: string): boolean => {
  assert(path.length > 0)

  if (path === FIXTURE_PATH) {
    return false
  }

  const cited = CITED_EXTENSIONS.some((extension) => path.endsWith(extension))

  assert(typeof cited === 'boolean')

  return cited
}

const citedSources = (tracked: string[]): RuleSource[] => {
  assert(tracked.length > 0)
  assert(tracked.length <= CITED_FILES_MAX)

  const sources = tracked
    .filter((path) => isCitedFile(path))
    .map((path) => ({ file: path, text: readText(path) }))

  assert(sources.length <= tracked.length)

  return sources
}

export const checkPolicy = (policy: Policy): Outcome => {
  assert(policy.deviation.file.length > 0)
  assert(policy.vulnerability.accept_file.length > 0)

  const rulesText = readText(RULES_PATH)
  const rules = parseRules(rulesText)
  const categories = new Map(rules.map((rule) => [rule.id, rule.category]))
  const ruleSources = RULE_FILES.map((file) => ({
    file,
    text: readText(file),
  }))
  const known = identifiersOf(ruleSources)
  const tracked = trackedFiles()
  const deviations = readDeviations(policy.deviation.file)
  const date = today()
  const problems = [
    ...unparsedProblems(rulesText, rules, 'DOC-01'),
    ...citationProblems(citedSources(tracked), known, 'DOC-02'),
    ...collisionProblems(ruleSources, 'DOC-03'),
    ...workspaceProblems(policy, readYaml<Workspace>(WORKSPACE_PATH)),
    ...dependabotProblems(policy, readYaml<Dependabot>(DEPENDABOT_PATH)),
    ...deviationProblems(deviations, {
      ids: { expiry: 'DEV-03', fields: 'DEV-01', mandatory: 'DEV-02' },
      maxDays: policy.deviation.max_days,
      rules,
      todayIso: date,
    }),
    ...acceptedVulnerabilityProblems(
      policy,
      acceptedVulnerabilities(policy.vulnerability.accept_file),
      date,
    ),
    ...forbiddenIgnoreFileProblems(),
    ...binaryArtifactProblems(policy, tracked),
  ]

  assert(categories.size > 0, `${RULES_PATH} holds no rule`)

  return { notes: [], problems }
}
