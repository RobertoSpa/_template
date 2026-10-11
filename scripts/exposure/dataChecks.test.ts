import {
  firestoreProblems,
  hostProblems,
  migrationProblems,
  packageProblems,
  postgresTestProblems,
} from './dataChecks.ts'
import { describe, expect, it } from 'vitest'

const GOOD = [
  'create table public.posts (id int);',
  'alter table public.posts enable row level security;',
  'alter table public.posts force row level security;',
  'grant select on public.posts to anon;',
  'create view public.titles with (security_invoker = true) as select id from posts;',
].join('\n')

describe('migrationProblems', () => {
  it('gives no problem for a table with both lines and a listed grant', () => {
    expect(migrationProblems([['m1.sql', GOOD]], ['posts'])).toStrictEqual([])
  })

  it.each([
    [
      'create table posts (id int);',
      [],
      [
        'm1.sql creates the table posts with no enable row level security. Do: Add alter table posts enable row level security to m1.sql. Rule DATA-02.',
        'm1.sql creates the table posts with no force row level security. Do: Add alter table posts force row level security to m1.sql. Rule DATA-02.',
      ],
    ],
    [
      'alter table posts disable row level security;',
      [],
      [
        'm1.sql turns row level security off. Do: Remove the disable or no force line from m1.sql. Rule DATA-02.',
      ],
    ],
    [
      'create policy p on posts for select to anon using (true);',
      [],
      [
        'm1.sql has a policy that is always true. Do: Replace using (true) in m1.sql with a condition on the row. Rule DATA-03.',
      ],
    ],
    [
      'grant select on posts to anon;',
      [],
      [
        'm1.sql grants select on posts to anon. Do: Remove the grant, or add posts to data.postgres.anon_readable and grant select only. Rule DATA-03.',
      ],
    ],
    [
      'grant insert, select on posts to anon;',
      ['posts'],
      [
        'm1.sql grants insert, select on posts to anon. Do: Remove the grant, or add posts to data.postgres.anon_readable and grant select only. Rule DATA-03.',
      ],
    ],
    [
      'create view titles as select 1;',
      [],
      [
        'm1.sql creates a view with no security_invoker = true. Do: Add with (security_invoker = true) to the view in m1.sql. Rule DATA-04.',
      ],
    ],
    [
      'create function f() returns int language sql security definer as $$ select 1 $$;',
      [],
      [
        "m1.sql has a security definer function with no search_path. Do: Add set search_path = '' to the function in m1.sql. Rule DATA-04.",
      ],
    ],
  ])('names the defects of %s', (text, anonReadable, lines) => {
    expect(migrationProblems([['m1.sql', text]], anonReadable)).toStrictEqual(
      lines,
    )
  })
})

describe('postgresTestProblems', () => {
  it('accepts a table with a test that sets the role anon', () => {
    expect(
      postgresTestProblems(
        ['posts'],
        [['t.sql', 'set local role anon;\nselect * from posts;']],
      ),
    ).toStrictEqual([])
  })

  it('refuses a table whose only test runs as the owner', () => {
    expect(
      postgresTestProblems(['posts'], [['t.sql', 'select * from posts;']]),
    ).toStrictEqual([
      'the table posts is anon readable and no test file sets the role anon and names it. Do: Write a pgTAP file that sets local role anon and reads posts. Rule DATA-05.',
    ])
  })
})

describe('firestoreProblems', () => {
  const rules = 'match /{document=**} { allow read, write: if false; }'
  const tests =
    'const anon = env.unauthenticatedContext(); await assertFails(getDoc(anon))'

  it('gives no problem for a deny-all file with a test', () => {
    expect(firestoreProblems(rules, tests)).toStrictEqual([])
  })

  it.each([
    [
      undefined,
      tests,
      [
        'the firestore rules file is missing. Do: Create the rules file that data.firestore.rules names. Rule DATA-06.',
      ],
    ],
    [
      'match /posts/{id} { allow read: if true; }',
      tests,
      [
        'the firestore rules file does not end with a match of each document that denies read and write. Do: Add match /{document=**} { allow read, write: if false; } as the last match. Rule DATA-06.',
        'the firestore rules file holds if true. Do: Replace if true with a condition on the request. Rule DATA-06.',
      ],
    ],
    [
      rules,
      'const anon = env.unauthenticatedContext()',
      [
        'the firestore rules test does not call unauthenticatedContext and assertFails. Do: Write a rules unit test with unauthenticatedContext and assertFails for each collection. Rule DATA-06.',
      ],
    ],
  ])('names the defects of %j', (rulesText, testsText, lines) => {
    expect(firestoreProblems(rulesText, testsText)).toStrictEqual(lines)
  })
})

describe('packageProblems', () => {
  const packages = { firestore: ['firebase'], postgres: ['pg', 'prisma'] }

  it('gives no problem when no package of another layer is present', () => {
    expect(packageProblems('none', packages, ['react'])).toStrictEqual([])
  })

  it('accepts a package of the named layer', () => {
    expect(packageProblems('postgres', packages, ['pg'])).toStrictEqual([])
  })

  it('refuses a package with no rules', () => {
    expect(
      packageProblems('none', { ...packages, unsupported: ['convex'] }, [
        'convex',
      ]),
    ).toStrictEqual([
      'package.json has convex, and this pipeline has no rule for its data layer. Do: Remove convex, or write the rules of its data layer in docs/agents/exposure.md first. Rule DATA-01.',
    ])
  })

  it('refuses a package of a different layer', () => {
    expect(packageProblems('none', packages, ['firebase'])).toStrictEqual([
      'package.json has firebase, a package of the data layer firestore, and data.kind is none. Do: Set data.kind to firestore in exposure/policy.yaml, or remove firebase. Rule DATA-01.',
    ])
  })
})

describe('hostProblems', () => {
  const hosts = {
    firestore: ['firebaseio.com'],
    postgres: ['.supabase.co'],
    unsupported: ['.convex.cloud'],
  }

  it('gives no problem when no served file names a host of another layer', () => {
    expect(
      hostProblems('none', hosts, [['assets/a.js', 'fetch("/api")']]),
    ).toStrictEqual([])
  })

  it('accepts the host of the named layer', () => {
    expect(
      hostProblems('postgres', hosts, [
        ['assets/a.js', 'https://x.supabase.co/rest/v1'],
      ]),
    ).toStrictEqual([])
  })

  it('refuses a host with no rules', () => {
    expect(
      hostProblems('none', hosts, [['assets/a.js', 'wss://x.convex.cloud']]),
    ).toStrictEqual([
      'assets/a.js names .convex.cloud, and this pipeline has no rule for its data layer. Do: Remove the call to .convex.cloud, or write the rules of its data layer in docs/agents/exposure.md first. Rule DATA-01.',
    ])
  })

  it('refuses the host of a different layer', () => {
    expect(
      hostProblems('none', hosts, [
        ['assets/a.js', 'https://x.supabase.co/rest/v1'],
      ]),
    ).toStrictEqual([
      'assets/a.js names .supabase.co, a host of the data layer postgres, and data.kind is none. Do: Set data.kind to postgres in exposure/policy.yaml. Rule DATA-01.',
    ])
  })
})
