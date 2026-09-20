import {
  type AcceptedVulnerability,
  acceptedVulnerabilityProblems,
  binaryArtifactProblems,
  categoriesOf,
  type Dependabot,
  dependabotProblems,
  type Deviation,
  deviationProblems,
  type Policy,
  type Workspace,
  workspaceProblems,
} from './policyChecks.ts'
import {
  exists,
  type Outcome,
  readText,
  readYaml,
  today,
  trackedFiles,
} from './shared.ts'
import assert from 'node:assert'
import { parse as parseToml } from 'smol-toml'

const RULES_PATH = 'docs/agents/security.md'
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

export const checkPolicy = (policy: Policy): Outcome => {
  assert(policy.deviation.file.length > 0)
  assert(policy.vulnerability.accept_file.length > 0)

  const categories = categoriesOf(readText(RULES_PATH))
  const deviations = readYaml<Deviation[] | null>(policy.deviation.file) ?? []
  const date = today()
  const problems = [
    ...workspaceProblems(policy, readYaml<Workspace>(WORKSPACE_PATH)),
    ...dependabotProblems(policy, readYaml<Dependabot>(DEPENDABOT_PATH)),
    ...deviationProblems(policy, categories, deviations, date),
    ...acceptedVulnerabilityProblems(
      policy,
      acceptedVulnerabilities(policy.vulnerability.accept_file),
      date,
    ),
    ...forbiddenIgnoreFileProblems(),
    ...binaryArtifactProblems(policy, trackedFiles()),
  ]

  assert(categories.size > 0, `${RULES_PATH} holds no rule`)

  return { notes: [], problems }
}
