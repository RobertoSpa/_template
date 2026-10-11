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
import { type Policy } from './shared.ts'
import { egressProblems, workflowProblems } from './workflowChecks.ts'
import { describe, expect, it } from 'vitest'

const HEADERS: Policy['headers'] = {
  absent: [
    'access-control-allow-origin',
    'server',
    'x-powered-by',
    'x-xss-protection',
  ],
  cache: { hashed: 'public, max-age=31536000, immutable', other: 'no-cache' },
  csp: {
    'base-uri': ["'none'"],
    'default-src': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'require-trusted-types-for': ["'script'"],
    'script-src': ["'self'"],
  },
  fixed: {
    'cross-origin-embedder-policy': 'require-corp',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  },
  html_content_type: 'text/html; charset=utf-8',
  permissions_denied: ['camera'],
}
const POLICY: Policy = {
  data: {
    firestore: { rules: 'firestore.rules', tests: 'firestore.rules.test.ts' },
    hosts: { firestore: ['firebaseio.com'], postgres: ['.supabase.co'] },
    kind: 'none',
    packages: { firestore: ['firebase'], postgres: ['pg'] },
    postgres: {
      anon_readable: [],
      migrations: 'supabase/migrations',
      tests: 'supabase/tests',
    },
  },
  deviation: { file: 'exposure/deviations.yaml', max_days: 30 },
  gates: ['policy', 'data', 'adapters', 'output', 'probe'],
  headers: HEADERS,
  live: { url: '' },
  output: {
    dir: 'dist',
    dot_allowed: ['.well-known'],
    file_bytes_max: 5_242_880,
    files_max: 200,
    gitleaks_config: 'exposure/gitleaks.toml',
    manifest: 'reports/exposure/manifest.json',
    security_txt: {
      expires_days_max: 365,
      expires_days_min: 30,
      path: '.well-known/security.txt',
    },
    served_extensions: ['.html', '.js'],
    skip: ['.map', '.vite/'],
  },
  probe: {
    foreign_origin: 'https://evil.example',
    paths: ['/.env'],
    report: 'reports/exposure/probe.json',
    suite: 'e2e/exposure.e2e.ts',
  },
  routes: {
    anonymous_status: 404,
    audiences: ['public', 'user'],
    file: 'exposure/routes.yaml',
    method_status: 405,
    methods_default: ['GET', 'HEAD'],
    scopes: ['owner', 'public', 'tenant'],
  },
  server: {
    authorize: 'apps/api/src/authorize.ts',
    handlers: 'apps/api/src/routes',
    kind: 'none',
  },
  version: 1,
}
const WORKFLOW = [
  'steps:',
  '  - run: pnpm install',
  '  - run: pnpm exposure',
].join('\n')

describe('gateProblems', () => {
  it('gives no problem for the five gates and no live url', () => {
    expect(gateProblems(POLICY.gates, '')).toStrictEqual([])
  })

  it.each([
    [
      ['policy', 'data', 'adapters', 'output'],
      '',
      'gates has no probe. Do: Add probe to gates. Rule ESOT-02.',
    ],
    [
      [...POLICY.gates, 'live'],
      '',
      'gates holds live, which is not a gate. Do: Remove live from gates. Rule PROBE-03.',
    ],
    [
      POLICY.gates,
      'https://example.com',
      'gates has no live. Do: Add live to gates. Rule ESOT-02.',
    ],
    [
      [...POLICY.gates, 'write'],
      '',
      'gates holds write, which is not a gate. Do: Remove write from gates. Rule ESOT-02.',
    ],
  ])('names the defect of %j with the url %j', (gates, url, line) => {
    expect(gateProblems(gates, url)).toStrictEqual([line])
  })
})

describe('numberProblems', () => {
  it('gives no problem for the policy of the template', () => {
    expect(numberProblems(POLICY)).toStrictEqual([])
  })

  it.each([
    [
      { output: { ...POLICY.output, files_max: 0 } },
      'output.files_max is 0, and it must be a positive integer. Do: Set output.files_max to a positive integer. Rule ESOT-01.',
    ],
    [
      { routes: { ...POLICY.routes, anonymous_status: 404.5 } },
      'routes.anonymous_status is 404.5, and it must be a positive integer. Do: Set routes.anonymous_status to a positive integer. Rule ESOT-01.',
    ],
  ])('names the defect of %o', (change, line) => {
    expect(numberProblems({ ...POLICY, ...change })).toStrictEqual([line])
  })
})

describe('headerProblems', () => {
  it('gives no problem for the strict set', () => {
    expect(headerProblems(HEADERS)).toStrictEqual([])
  })

  it.each([
    [
      { csp: { ...HEADERS.csp, 'object-src': ["'self'"] } },
      "headers.csp.object-src is not 'none'. Do: Set headers.csp.object-src to ['none']. Rule HDR-02.",
    ],
    [
      { csp: { ...HEADERS.csp, 'script-src': ["'self'", "'unsafe-inline'"] } },
      "headers.csp.script-src holds 'unsafe-inline'. Do: Remove 'unsafe-inline' from headers.csp.script-src. Rule HDR-02.",
    ],
    [
      { csp: { ...HEADERS.csp, 'img-src': ['https:'] } },
      'headers.csp.img-src holds https:. Do: Remove https: from headers.csp.img-src. Rule HDR-02.',
    ],
    [
      { fixed: { ...HEADERS.fixed, 'x-frame-options': 'SAMEORIGIN' } },
      'headers.fixed.x-frame-options is not DENY. Do: Set headers.fixed.x-frame-options to DENY. Rule HDR-05.',
    ],
    [
      {
        fixed: {
          ...HEADERS.fixed,
          'strict-transport-security': 'max-age=31536000',
        },
      },
      'headers.fixed.strict-transport-security is not max-age=63072000; includeSubDomains; preload. Do: Set headers.fixed.strict-transport-security to max-age=63072000; includeSubDomains; preload. Rule HDR-03.',
    ],
    [
      { fixed: { ...HEADERS.fixed, 'X-Custom': 'a' } },
      'headers.fixed holds the name X-Custom, and a name is lowercase. Do: Rename X-Custom to lowercase. Rule HDR-01.',
    ],
    [
      { absent: ['access-control-allow-origin', 'server', 'x-powered-by'] },
      'headers.absent has no x-xss-protection. Do: Add x-xss-protection to headers.absent. Rule HDR-07.',
    ],
    [
      { permissions_denied: [] },
      'headers.permissions_denied is empty. Do: Add each unused feature to headers.permissions_denied. Rule HDR-06.',
    ],
  ])('names the defect of %o', (change, line) => {
    expect(headerProblems({ ...HEADERS, ...change })).toStrictEqual([line])
  })
})

describe('routeRecordProblems', () => {
  it('gives no problem when each bundle route has a public record', () => {
    expect(
      routeRecordProblems(
        [{ audience: 'public', path: '/' }],
        ['/'],
        POLICY.routes,
        'none',
      ),
    ).toStrictEqual([])
  })

  it('accepts a route with a parameter and a scope', () => {
    expect(
      routeRecordProblems(
        [{ audience: 'public', path: '/posts/:id', scope: 'public' }],
        ['/posts/:id'],
        POLICY.routes,
        'none',
      ),
    ).toStrictEqual([])
  })

  it.each([
    [
      { audience: 'public', path: '/posts/:id' },
      'record 0 has a parameter in its path and no scope. Do: Set the scope of record 0 to one of owner, public, tenant. Rule ROUTE-08.',
    ],
    [
      { audience: 'public', path: '/posts', scope: 'mine' },
      'record 0 has the scope mine, which is not in routes.scopes. Do: Set the scope of record 0 to one of owner, public, tenant. Rule ROUTE-08.',
    ],
  ])('names the scope defect of %j', (record, line) => {
    expect(
      routeRecordProblems([record], [record.path], POLICY.routes, 'none'),
    ).toStrictEqual([line])
  })

  it('accepts a user route when a server exists', () => {
    expect(
      routeRecordProblems(
        [{ audience: 'user', methods: ['GET'], path: '/account' }],
        ['/account'],
        POLICY.routes,
        'node',
      ),
    ).toStrictEqual([])
  })

  it.each([
    [
      [{ audience: 'public', path: 'settings' }],
      ['/'],
      [
        'record 0 has the path settings, and a path starts with /. Do: Set the path of record 0 to /settings. Rule ROUTE-01.',
        'the route / has a record in bundle/policy.yaml and no record in routes. Do: Add a record for / with its audience to exposure/routes.yaml. Rule ROUTE-01.',
      ],
    ],
    [
      [
        { audience: 'public', path: '/' },
        { audience: 'public', path: '/' },
      ],
      ['/'],
      [
        'record 1 has the path / a second time. Do: Remove record 1. Rule ROUTE-01.',
      ],
    ],
    [
      [{ audience: 'admin', path: '/' }],
      ['/'],
      [
        'record 0 has the audience admin, which is not in routes.audiences. Do: Set the audience of record 0 to one of public, user. Rule ROUTE-01.',
      ],
    ],
    [
      [{ audience: 'user', path: '/' }],
      ['/'],
      [
        'record 0 has the audience user, and a static build serves each path to the public. Do: Add a server and set server.kind before a route gets the audience user. Rule ROUTE-02.',
      ],
    ],
    [
      [{ audience: 'public', methods: ['get'], path: '/' }],
      ['/'],
      [
        'record 0 has the method get, and a method is uppercase. Do: Set the method of record 0 to GET. Rule ROUTE-01.',
      ],
    ],
  ])('names the defects of %j', (records, bundlePaths, lines) => {
    expect(
      routeRecordProblems(records, bundlePaths, POLICY.routes, 'none'),
    ).toStrictEqual(lines)
  })
})

describe('egressProblems', () => {
  it('gives no problem with no live url', () => {
    expect(egressProblems(WORKFLOW, '')).toStrictEqual([])
  })

  it('accepts a workflow that lets the runner out to the host', () => {
    expect(
      egressProblems(
        `${WORKFLOW}\n            app.example:443`,
        'https://app.example/',
      ),
    ).toStrictEqual([])
  })

  it('refuses a workflow that keeps the runner in', () => {
    expect(egressProblems(WORKFLOW, 'https://app.example')).toStrictEqual([
      'the exposure workflow lets no traffic out to app.example. Do: Add app.example:443 to allowed-endpoints in .github/workflows/exposure.yml. Rule PROBE-03.',
    ])
  })
})

describe('keyProblems', () => {
  it('gives no problem for the keys of the template', () => {
    expect(
      keyProblems(POLICY as unknown as Record<string, unknown>),
    ).toStrictEqual([])
  })

  it.each([
    [
      { ...POLICY, extra: 1 },
      'extra is not a key of the policy file. Do: Remove extra from exposure/policy.yaml. Rule ESOT-01.',
    ],
    [
      { ...POLICY, headers: { ...POLICY.headers, nonce: 'x' } },
      'headers.nonce is not a key of the policy file. Do: Remove headers.nonce from exposure/policy.yaml. Rule ESOT-01.',
    ],
    [
      { ...POLICY, output: { ...POLICY.output, hash_pattern: 'x' } },
      'output.hash_pattern is not a key of the policy file. Do: Remove output.hash_pattern from exposure/policy.yaml. Rule ESOT-01.',
    ],
  ])('names the defect of %o', (raw, line) => {
    expect(
      keyProblems(raw as unknown as Record<string, unknown>),
    ).toStrictEqual([line])
  })
})

describe('nonceProblems', () => {
  it('asks nothing of a static build', () => {
    expect(nonceProblems(HEADERS.csp, 'none')).toStrictEqual([])
  })

  it('wants strict-dynamic once a server exists', () => {
    expect(nonceProblems(HEADERS.csp, 'node')).toStrictEqual([
      "server.kind is node and headers.csp.script-src has no 'strict-dynamic'. Do: Add 'strict-dynamic' to headers.csp.script-src and mint a nonce per response in the server. Rule HDR-02.",
    ])
  })

  it('accepts a server with strict-dynamic', () => {
    expect(
      nonceProblems(
        { ...HEADERS.csp, 'script-src': ["'strict-dynamic'"] },
        'node',
      ),
    ).toStrictEqual([])
  })
})

describe('workflowProblems', () => {
  it('gives no problem for one exact step', () => {
    expect(workflowProblems(WORKFLOW)).toStrictEqual([])
  })

  it.each([
    [
      'steps:\n  - run: pnpm install',
      'the exposure workflow has 0 exposure steps, and it must have 1. Do: Keep one step, run: pnpm exposure. Rule ESOT-02.',
    ],
    [
      'steps:\n  - run: pnpm exposure:policy',
      'the exposure step of the workflow is not exactly `pnpm exposure`. Do: Set the step to run: pnpm exposure. Rule ESOT-02.',
    ],
    [
      `${WORKFLOW}\n    continue-on-error: true`,
      'the exposure workflow holds continue-on-error. Do: Remove continue-on-error from the workflow. Rule ESOT-02.',
    ],
  ])('names the defect of %j', (text, line) => {
    expect(workflowProblems(text)).toStrictEqual([line])
  })
})

describe('dangerProblems', () => {
  it('accepts a file with the marker in its first five lines', () => {
    expect(
      dangerProblems([['a.yaml', '# one\n# two\n# DANGER: a leak\nkey: 1']]),
    ).toStrictEqual([])
  })

  it('refuses a file with the marker on line six', () => {
    expect(
      dangerProblems([['a.yaml', '#\n#\n#\n#\n#\n# DANGER: late']]),
    ).toStrictEqual([
      'a.yaml does not start with a DANGER: comment. Do: Add a comment with DANGER: and the damage of an incorrect value to the top of a.yaml. Rule ESOT-06.',
    ])
  })
})

describe('causeProblems', () => {
  it('accepts a rule that cites a document', () => {
    expect(
      causeProblems('- **X-01 (M, proven).** Text. Cause: RFC 9110. Test: a.'),
    ).toStrictEqual([])
  })

  it.each([
    ['- **X-01 (M, proven).** Text. Cause: @alice said so. Test: a.'],
    ['- **X-01 (M, proven).** Text. Cause: issue #12. Test: a.'],
    ['- **X-01 (M, proven).** Text. Cause: as agreed in the call. Test: a.'],
  ])('refuses %s', (line) => {
    expect(causeProblems(`# Title\n${line}`)).toStrictEqual([
      'docs/agents/exposure.md line 2 cites a chat, a ticket, or a memory. Do: Cite a public document or name the damage. Rule ESOT-07.',
    ])
  })
})

describe('identifierProblems', () => {
  it('accepts a file that keeps each identifier of main', () => {
    expect(
      identifierProblems(new Set(['A-01', 'A-02']), new Set(['A-01'])),
    ).toStrictEqual([])
  })

  it('refuses a file that dropped an identifier of main', () => {
    expect(
      identifierProblems(new Set(['A-02']), new Set(['A-01', 'A-02'])),
    ).toStrictEqual([
      'the rule A-01 is on origin/main and not in docs/agents/exposure.md. Do: Put A-01 back with the layer retired. Rule ESOT-05.',
    ])
  })
})

describe('handlerProblems', () => {
  it('accepts a handler that imports authorize', () => {
    expect(
      handlerProblems([
        ['routes/a.ts', "import { authorize } from '../authorize.ts'"],
      ]),
    ).toStrictEqual([])
  })

  it('refuses a handler with no import', () => {
    expect(
      handlerProblems([['routes/a.ts', 'export const a = 1']]),
    ).toStrictEqual([
      'routes/a.ts does not import server.authorize. Do: Import authorize in routes/a.ts and call it before the data. Rule ROUTE-05.',
    ])
  })
})

describe('limitsOf', () => {
  it('gives each list and number with its safe direction', () => {
    expect(limitsOf(POLICY)).toStrictEqual({
      lists: [
        ['headers.absent', HEADERS.absent, 'larger'],
        ['headers.permissions_denied', ['camera'], 'larger'],
        ['output.dot_allowed', ['.well-known'], 'smaller'],
        ['output.served_extensions', ['.html', '.js'], 'smaller'],
        ['probe.paths', ['/.env'], 'larger'],
        ['routes.audiences', ['public', 'user'], 'smaller'],
        ['headers.csp.base-uri', ["'none'"], 'smaller'],
        ['headers.csp.default-src', ["'self'"], 'smaller'],
        ['headers.csp.form-action', ["'self'"], 'smaller'],
        ['headers.csp.frame-ancestors', ["'none'"], 'smaller'],
        ['headers.csp.object-src', ["'none'"], 'smaller'],
        ['headers.csp.require-trusted-types-for', ["'script'"], 'smaller'],
        ['headers.csp.script-src', ["'self'"], 'smaller'],
      ],
      numbers: [
        ['deviation.max_days', 30, 'smaller'],
        ['output.file_bytes_max', 5_242_880, 'smaller'],
        ['output.files_max', 200, 'smaller'],
        ['output.security_txt.expires_days_max', 365, 'smaller'],
        ['output.security_txt.expires_days_min', 30, 'larger'],
        ['routes.anonymous_status', 404, 'larger'],
        ['routes.method_status', 405, 'larger'],
      ],
    })
  })
})
