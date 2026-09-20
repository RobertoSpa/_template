import { type Policy } from './policyChecks.ts'
import { secretFileProblems } from './secretsChecks.ts'
import { execute, type Outcome, tail, trackedFiles } from './shared.ts'
import assert from 'node:assert'

const gitleaksProblems = (): string[] => {
  const result = execute('gitleaks', ['git', '--no-banner', '--redact', '.'])

  assert(typeof result.status === 'number')

  return result.status === 0
    ? []
    : ['gitleaks found a secret in the history', ...tail(result.output)]
}

export const checkSecrets = (policy: Policy): Outcome => {
  assert(Array.isArray(policy.secrets.filename_patterns))
  assert(policy.secrets.filename_patterns.length > 0)

  const problems = [
    ...secretFileProblems(policy.secrets.filename_patterns, trackedFiles()),
    ...gitleaksProblems(),
  ]

  assert(problems.every((problem) => problem.length > 0))

  return { notes: [], problems }
}
