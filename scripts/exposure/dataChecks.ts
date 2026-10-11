import { problem } from './shared.ts'
import assert from 'node:assert'

// One migration or one test file, by path and text.
export type TextFile = [string, string]

const FILES_MAX = 10_000
const TABLES_MAX = 10_000
const CREATE_TABLE = /create table (?:if not exists )?([\w".]+)/giu
const DISABLE_RLS = /(?:disable|no force) row level security/iu
const ALWAYS_TRUE = /(?:using|with check)\s*\(\s*true\s*\)/iu
const GRANT_ANON =
  /grant ([\w, ]+) on (?:table )?([\w".]+) to (?:anon|public)\b/giu
const CREATE_VIEW = /create (?:or replace )?view/iu
const SECURITY_INVOKER = /security_invoker\s*=\s*(?:true|on)/iu
const SECURITY_DEFINER = /security definer/iu
const SEARCH_PATH = /set search_path/iu
const ANON_ROLE =
  /set local role anon|tests\.clear_authentication|unauthenticatedContext/u
const FIRESTORE_DENY =
  /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;?\s*\}/u
const FIRESTORE_TRUE = /if\s+true\b/u
const FIRESTORE_TEST_CONTEXT = /unauthenticatedContext/u
const FIRESTORE_TEST_FAILS = /assertFails/u
const UNSUPPORTED = 'unsupported'

// public."posts" and posts name one table. The last segment, with no quote, is the name.
const nameOf = (raw: string): string => {
  assert(raw.length > 0)

  const segments = raw.replaceAll('"', '').split('.')

  assert(segments.length <= 3)

  return segments[segments.length - 1]
}

const tablesOf = (text: string): string[] => {
  assert(typeof text === 'string')

  const names = [...text.matchAll(CREATE_TABLE)].map((match) =>
    nameOf(match[1]),
  )

  assert(names.length <= TABLES_MAX)

  return names
}

const rlsLines = (table: string): [RegExp, RegExp] => {
  assert(table.length > 0)
  assert(/^\w+$/u.test(table))

  return [
    new RegExp(
      `alter table (?:only )?(?:"?\\w+"?\\.)?"?${table}"? enable row level security`,
      'iu',
    ),
    new RegExp(
      `alter table (?:only )?(?:"?\\w+"?\\.)?"?${table}"? force row level security`,
      'iu',
    ),
  ]
}

const tableProblems = (path: string, text: string): string[] => {
  assert(path.length > 0)
  assert(typeof text === 'string')

  return tablesOf(text).flatMap((table) => {
    const [enable, force] = rlsLines(table)
    const problems: string[] = []

    if (!enable.test(text)) {
      problems.push(
        problem(
          `${path} creates the table ${table} with no enable row level security`,
          `Add alter table ${table} enable row level security to ${path}`,
          'DATA-02',
        ),
      )
    }

    if (!force.test(text)) {
      problems.push(
        problem(
          `${path} creates the table ${table} with no force row level security`,
          `Add alter table ${table} force row level security to ${path}`,
          'DATA-02',
        ),
      )
    }

    return problems
  })
}

const grantProblems = (
  path: string,
  text: string,
  anonReadable: string[],
): string[] => {
  assert(path.length > 0)
  assert(Array.isArray(anonReadable))

  const normalized = text.replaceAll(/\s+/gu, ' ')

  return [...normalized.matchAll(GRANT_ANON)].flatMap((match) => {
    const privileges = match[1].trim().toLowerCase()
    const table = nameOf(match[2])
    const allowed = privileges === 'select' && anonReadable.includes(table)

    return allowed
      ? []
      : [
          problem(
            `${path} grants ${privileges} on ${table} to anon`,
            `Remove the grant, or add ${table} to data.postgres.anon_readable and grant select only`,
            'DATA-03',
          ),
        ]
  })
}

const oneMigrationProblems = (
  path: string,
  text: string,
  anonReadable: string[],
): string[] => {
  assert(path.length > 0)
  assert(typeof text === 'string')

  const problems = [
    ...tableProblems(path, text),
    ...grantProblems(path, text, anonReadable),
  ]

  if (DISABLE_RLS.test(text)) {
    problems.push(
      problem(
        `${path} turns row level security off`,
        `Remove the disable or no force line from ${path}`,
        'DATA-02',
      ),
    )
  }

  if (ALWAYS_TRUE.test(text)) {
    problems.push(
      problem(
        `${path} has a policy that is always true`,
        `Replace using (true) in ${path} with a condition on the row`,
        'DATA-03',
      ),
    )
  }

  if (CREATE_VIEW.test(text) && !SECURITY_INVOKER.test(text)) {
    problems.push(
      problem(
        `${path} creates a view with no security_invoker = true`,
        `Add with (security_invoker = true) to the view in ${path}`,
        'DATA-04',
      ),
    )
  }

  if (SECURITY_DEFINER.test(text) && !SEARCH_PATH.test(text)) {
    problems.push(
      problem(
        `${path} has a security definer function with no search_path`,
        `Add set search_path = '' to the function in ${path}`,
        'DATA-04',
      ),
    )
  }

  return problems
}

export const migrationProblems = (
  migrations: TextFile[],
  anonReadable: string[],
): string[] => {
  assert(migrations.length <= FILES_MAX)
  assert(anonReadable.length <= TABLES_MAX)

  return migrations.flatMap(([path, text]) =>
    oneMigrationProblems(path, text, anonReadable),
  )
}

// Each anon-readable table has a test that runs as anon. Rule DATA-05.
export const postgresTestProblems = (
  anonReadable: string[],
  tests: TextFile[],
): string[] => {
  assert(anonReadable.length <= TABLES_MAX)
  assert(tests.length <= FILES_MAX)

  const asAnon = tests.filter(([, text]) => ANON_ROLE.test(text))

  return anonReadable
    .filter((table) => !asAnon.some(([, text]) => text.includes(table)))
    .map((table) =>
      problem(
        `the table ${table} is anon readable and no test file sets the role anon and names it`,
        `Write a pgTAP file that sets local role anon and reads ${table}`,
        'DATA-05',
      ),
    )
}

export const firestoreProblems = (
  rules: string | undefined,
  tests: string | undefined,
): string[] => {
  assert(rules === undefined || typeof rules === 'string')
  assert(tests === undefined || typeof tests === 'string')

  const problems: string[] = []

  if (rules === undefined) {
    problems.push(
      problem(
        'the firestore rules file is missing',
        'Create the rules file that data.firestore.rules names',
        'DATA-06',
      ),
    )
  } else {
    if (!FIRESTORE_DENY.test(rules)) {
      problems.push(
        problem(
          'the firestore rules file does not end with a match of each document that denies read and write',
          'Add match /{document=**} { allow read, write: if false; } as the last match',
          'DATA-06',
        ),
      )
    }

    if (FIRESTORE_TRUE.test(rules)) {
      problems.push(
        problem(
          'the firestore rules file holds if true',
          'Replace if true with a condition on the request',
          'DATA-06',
        ),
      )
    }
  }

  if (
    tests === undefined ||
    !FIRESTORE_TEST_CONTEXT.test(tests) ||
    !FIRESTORE_TEST_FAILS.test(tests)
  ) {
    problems.push(
      problem(
        'the firestore rules test does not call unauthenticatedContext and assertFails',
        'Write a rules unit test with unauthenticatedContext and assertFails for each collection',
        'DATA-06',
      ),
    )
  }

  return problems
}

// A package of a different data layer is a data layer with no rule. Rule DATA-01.
export const packageProblems = (
  kind: string,
  packages: Record<string, string[]>,
  dependencies: string[],
): string[] => {
  assert(kind.length > 0)
  assert(dependencies.length <= FILES_MAX)

  return Object.entries(packages)
    .filter(([other]) => other !== kind)
    .flatMap(([other, names]) =>
      names
        .filter((name) => dependencies.includes(name))
        .map((name) =>
          other === UNSUPPORTED
            ? problem(
                `package.json has ${name}, and this pipeline has no rule for its data layer`,
                `Remove ${name}, or write the rules of its data layer in docs/agents/exposure.md first`,
                'DATA-01',
              )
            : problem(
                `package.json has ${name}, a package of the data layer ${other}, and data.kind is ${kind}`,
                `Set data.kind to ${other} in exposure/policy.yaml, or remove ${name}`,
                'DATA-01',
              ),
        ),
    )
}

// A served file that names the host of a data layer calls it over plain fetch. Rule DATA-01.
export const hostProblems = (
  kind: string,
  hosts: Record<string, string[]>,
  files: TextFile[],
): string[] => {
  assert(kind.length > 0)
  assert(files.length <= FILES_MAX)

  return Object.entries(hosts)
    .filter(([other]) => other !== kind)
    .flatMap(([other, names]) =>
      files.flatMap(([path, text]) =>
        names
          .filter((name) => text.includes(name))
          .map((name) =>
            other === UNSUPPORTED
              ? problem(
                  `${path} names ${name}, and this pipeline has no rule for its data layer`,
                  `Remove the call to ${name}, or write the rules of its data layer in docs/agents/exposure.md first`,
                  'DATA-01',
                )
              : problem(
                  `${path} names ${name}, a host of the data layer ${other}, and data.kind is ${kind}`,
                  `Set data.kind to ${other} in exposure/policy.yaml`,
                  'DATA-01',
                ),
          ),
      ),
    )
}
