import { type Outcome } from '../gates.ts'
import { exists, readText } from '../io.ts'
import {
  firestoreProblems,
  migrationProblems,
  packageProblems,
  postgresTestProblems,
  type TextFile,
} from './dataChecks.ts'
import { type Policy, problem } from './shared.ts'
import assert from 'node:assert'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_PATH = 'package.json'
const FILES_MAX = 10_000
const KINDS = ['none', 'postgres', 'firestore']

type Package = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const dependenciesOf = (): string[] => {
  const parsed = JSON.parse(readText(PACKAGE_PATH)) as Package
  const names = [
    ...Object.keys(parsed.dependencies ?? {}),
    ...Object.keys(parsed.devDependencies ?? {}),
  ]

  assert(names.length > 0)
  assert(names.length <= FILES_MAX)

  return names
}

const textFilesOf = (folder: string, extension: string): TextFile[] => {
  assert(folder.length > 0)
  assert(extension.startsWith('.'))

  if (!exists(folder)) {
    return []
  }

  const names = readdirSync(folder)
    .filter((name) => name.endsWith(extension))
    .toSorted()

  assert(names.length <= FILES_MAX)

  return names.map((name) => [join(folder, name), readText(join(folder, name))])
}

const postgresProblems = (postgres: Policy['data']['postgres']): string[] => {
  assert(postgres.migrations.length > 0)
  assert(postgres.tests.length > 0)

  if (!exists(postgres.migrations)) {
    return [
      problem(
        `data.kind is postgres and ${postgres.migrations} is missing`,
        `Create ${postgres.migrations} with the first migration`,
        'DATA-02',
      ),
    ]
  }

  return [
    ...migrationProblems(
      textFilesOf(postgres.migrations, '.sql'),
      postgres.anon_readable,
    ),
    ...postgresTestProblems(
      postgres.anon_readable,
      textFilesOf(postgres.tests, '.sql'),
    ),
  ]
}

const kindProblems = (data: Policy['data']): string[] => {
  assert(KINDS.length === 3)
  assert(typeof data.kind === 'string')

  if (data.kind === 'postgres') {
    return postgresProblems(data.postgres)
  }

  if (data.kind === 'firestore') {
    return firestoreProblems(
      exists(data.firestore.rules) ? readText(data.firestore.rules) : undefined,
      exists(data.firestore.tests) ? readText(data.firestore.tests) : undefined,
    )
  }

  if (data.kind === 'none') {
    return []
  }

  return [
    problem(
      `data.kind is ${data.kind}, and the kinds are ${KINDS.join(', ')}`,
      `Set data.kind to one of ${KINDS.join(', ')}`,
      'DATA-01',
    ),
  ]
}

export const checkData = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)
  assert(typeof policy.data.kind === 'string')

  const problems = [
    ...packageProblems(
      policy.data.kind,
      policy.data.packages,
      dependenciesOf(),
    ),
    ...kindProblems(policy.data),
  ]

  assert(problems.length <= FILES_MAX)

  return { notes: [`data layer: ${policy.data.kind}`], problems }
}
