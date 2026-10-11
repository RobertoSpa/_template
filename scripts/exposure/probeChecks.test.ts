import { headerSetOf } from './headers.ts'
import { reportProblems } from './probeChecks.ts'
import { type Policy, type Probe } from './shared.ts'
import { describe, expect, it } from 'vitest'

const HEADERS: Policy['headers'] = {
  absent: [
    'access-control-allow-origin',
    'server',
    'x-powered-by',
    'x-xss-protection',
  ],
  cache: { hashed: 'public, max-age=31536000, immutable', other: 'no-cache' },
  csp: { 'default-src': ["'self'"] },
  fixed: { 'x-frame-options': 'DENY' },
  html_content_type: 'text/html; charset=utf-8',
  permissions_denied: ['camera'],
}
const POLICY = {
  headers: HEADERS,
  routes: { anonymous_status: 404, method_status: 405 },
  server: { kind: 'none' },
} as Policy
const SET = headerSetOf(HEADERS)
const RECORDS = [
  { audience: 'public', path: '/' },
  { audience: 'user', path: '/account' },
]
const GOOD: Record<string, string> = {
  'cache-control': 'no-cache',
  'content-security-policy': "default-src 'self'",
  'content-type': 'text/html; charset=utf-8',
  'permissions-policy': 'camera=()',
  'x-frame-options': 'DENY',
}
const probe = (change: Partial<Probe>): Probe => ({
  body_sha256: 'root',
  headers: GOOD,
  kind: 'route',
  method: 'GET',
  path: '/',
  repeated: [],
  status: 200,
  ...change,
})
const check = (probes: Probe[], isolated = true) =>
  reportProblems(
    { console_errors: [], cross_origin_isolated: isolated, probes },
    SET,
    RECORDS,
    POLICY,
  )

describe('reportProblems', () => {
  it('gives no problem for a full set of good probes', () => {
    expect(
      check([
        probe({}),
        probe({ method: 'HEAD' }),
        probe({ kind: 'route', path: '/account', status: 404 }),
        probe({
          headers: { ...GOOD, allow: 'GET, HEAD' },
          kind: 'method',
          method: 'POST',
          status: 405,
        }),
        probe({ kind: 'unknown_file', path: '/nope.js', status: 404 }),
        probe({ kind: 'unknown_page', path: '/nope' }),
        probe({ kind: 'probe_path', path: '/.env', status: 404 }),
        probe({ kind: 'cors' }),
        probe({ kind: 'bypass' }),
        probe({
          headers: {
            ...GOOD,
            'cache-control': 'public, max-age=31536000, immutable',
          },
          kind: 'manifest',
          path: '/assets/a-BZxIwzb4.js',
        }),
        probe({ kind: 'map', path: '/assets/a-BZxIwzb4.js.map', status: 404 }),
      ]),
    ).toStrictEqual([])
  })

  it.each([
    [
      probe({ headers: { ...GOOD, 'x-frame-options': 'SAMEORIGIN' } }),
      [
        'GET / has x-frame-options: SAMEORIGIN, and the header set has x-frame-options: DENY. Do: Make the server send x-frame-options: DENY. Rule HDR-01.',
      ],
    ],
    [
      probe({
        headers: {
          ...GOOD,
          'content-security-policy': undefined as unknown as string,
        },
      }),
      [
        "GET / has content-security-policy: (missing), and the header set has content-security-policy: default-src 'self'. Do: Make the server send content-security-policy: default-src 'self'. Rule HDR-02.",
      ],
    ],
    [
      probe({ headers: { ...GOOD, server: 'nginx' } }),
      [
        'GET / has server: nginx. Do: Make the server drop server. Rule HDR-07.',
      ],
    ],
    [
      probe({ headers: { ...GOOD, 'set-cookie': 'a=1' } }),
      [
        'GET / has set-cookie: a=1, and a static build sets no cookie. Do: Remove the cookie from the host. Rule HDR-10.',
      ],
    ],
    [
      probe({
        headers: { ...GOOD, 'cache-control': 'no-cache' },
        kind: 'manifest',
        path: '/assets/a-BZxIwzb4.js',
      }),
      [
        'GET /assets/a-BZxIwzb4.js has cache-control: no-cache, and the rule wants public, max-age=31536000, immutable. Do: Make the server send cache-control: public, max-age=31536000, immutable for /assets/a-BZxIwzb4.js. Rule HDR-09.',
      ],
    ],
    [
      probe({ headers: { ...GOOD, 'content-type': 'text/html' } }),
      [
        'GET / has content-type: text/html, and the html type is text/html; charset=utf-8. Do: Make the server send content-type: text/html; charset=utf-8 for the html. Rule HDR-11.',
      ],
    ],
    [
      probe({ kind: 'route', path: '/account', status: 200 }),
      [
        'GET /account answers 200, and the rule wants 404. Do: Make the server answer 404 for GET /account. Rule ROUTE-03.',
      ],
    ],
    [
      probe({ kind: 'method', method: 'POST', status: 404 }),
      [
        'POST / answers 404, and the rule wants 405. Do: Make the server answer 405 for POST /. Rule ROUTE-03.',
        'POST / has no allow header. Do: Make the server send allow with the methods of the record. Rule ROUTE-03.',
      ],
    ],
    [
      probe({ kind: 'unknown_file', path: '/nope.js', status: 200 }),
      [
        'GET /nope.js answers 200, and the rule wants 404. Do: Make the server answer 404 for GET /nope.js. Rule ROUTE-04.',
      ],
    ],
    [
      probe({ body_sha256: 'other', kind: 'unknown_page', path: '/nope' }),
      [
        'GET /nope has a body that is not the body of /. Do: Make the fallback page the page of /. Rule ROUTE-04.',
      ],
    ],
    [
      probe({ kind: 'probe_path', path: '/.env', status: 200 }),
      [
        'GET /.env answers 200, and the rule wants 404. Do: Make the server answer 404 for GET /.env. Rule PROBE-02.',
      ],
    ],
    [
      probe({
        headers: {
          ...GOOD,
          'access-control-allow-origin': 'https://evil.example',
        },
        kind: 'cors',
      }),
      [
        'GET / has access-control-allow-origin: https://evil.example. Do: Make the server drop access-control-allow-origin. Rule HDR-07.',
        'GET / with a foreign origin has access-control-allow-origin: https://evil.example. Do: Make the server send no access-control-allow-origin. Rule HDR-08.',
      ],
    ],
    [
      probe({ kind: 'bypass', status: 500 }),
      [
        'GET / answers 500, and the rule wants 200. Do: Make the server answer 200 for GET /. Rule ROUTE-05.',
      ],
    ],
    [
      probe({ kind: 'map', path: '/assets/a-BZxIwzb4.js.map', status: 200 }),
      [
        'GET /assets/a-BZxIwzb4.js.map answers 200, and the rule wants 404. Do: Make the server answer 404 for GET /assets/a-BZxIwzb4.js.map. Rule ROUTE-04.',
      ],
    ],
  ])('names the defects of %o', (one, lines) => {
    expect(check([probe({}), one])).toStrictEqual(lines)
  })

  it('refuses a header that occurs two times', () => {
    expect(
      check([
        probe({}),
        probe({
          kind: 'unknown_page',
          path: '/nope',
          repeated: ['x-frame-options'],
        }),
      ]),
    ).toStrictEqual([
      'GET /nope has the header x-frame-options two times. Do: Make the server send x-frame-options one time. Rule HDR-01.',
    ])
  })

  it('compares a bypass probe with the route probe of its own path', () => {
    expect(
      check([
        probe({}),
        probe({ kind: 'route', path: '/account', status: 404 }),
        probe({ kind: 'bypass', path: '/account', status: 404 }),
      ]),
    ).toStrictEqual([])
    expect(
      check([
        probe({}),
        probe({ kind: 'route', path: '/account', status: 404 }),
        probe({ kind: 'bypass', path: '/account', status: 200 }),
      ]),
    ).toStrictEqual([
      'GET /account answers 200, and the rule wants 404. Do: Make the server answer 404 for GET /account. Rule ROUTE-05.',
    ])
  })

  it('compares the body of a manifest probe with the manifest', () => {
    const manifest = [{ bytes: 3, path: 'assets/a-BZxIwzb4.js', sha256: 'abc' }]
    const immutable = {
      ...GOOD,
      'cache-control': 'public, max-age=31536000, immutable',
    }
    const good = probe({
      body_sha256: 'abc',
      headers: immutable,
      kind: 'manifest',
      path: '/assets/a-BZxIwzb4.js',
    })
    const bad = probe({
      body_sha256: 'def456789012xyz',
      headers: immutable,
      kind: 'manifest',
      path: '/assets/a-BZxIwzb4.js',
    })

    expect(
      reportProblems(
        {
          console_errors: [],
          cross_origin_isolated: true,
          probes: [probe({}), good],
        },
        SET,
        RECORDS,
        POLICY,
        manifest,
      ),
    ).toStrictEqual([])
    expect(
      reportProblems(
        {
          console_errors: [],
          cross_origin_isolated: true,
          probes: [probe({}), bad],
        },
        SET,
        RECORDS,
        POLICY,
        manifest,
      ),
    ).toStrictEqual([
      'GET /assets/a-BZxIwzb4.js has the body def456789012, and the manifest has abc. Do: Upload the files of the manifest, and nothing else, then run the probe again. Rule OUT-06.',
    ])
  })

  it('refuses an empty report and a page that is not isolated', () => {
    expect(check([], false)).toStrictEqual([
      'the report has no probe. Do: Run the suite, which writes one probe per response. Rule PROBE-01.',
      'the page of / reads crossOriginIsolated as false. Do: Make the server send cross-origin-opener-policy: same-origin and cross-origin-embedder-policy: require-corp. Rule HDR-05.',
    ])
  })

  it('refuses a policy violation on the console of /', () => {
    expect(
      reportProblems(
        {
          console_errors: [
            "Applying inline style violates the following Content Security Policy directive 'style-src 'self''.",
          ],
          cross_origin_isolated: true,
          probes: [probe({})],
        },
        SET,
        RECORDS,
        POLICY,
      ),
    ).toStrictEqual([
      "the page of / logs a policy violation: Applying inline style violates the following Content Security Policy directive 'style-src 'self''. Do: Remove the inline code from the page, or add its hash to headers.csp. Rule HDR-02.",
    ])
  })

  it('accepts a host cookie when a server exists', () => {
    const policy = { ...POLICY, server: { kind: 'node' } } as Policy
    const cookie = '__Host-session=abc; Secure; HttpOnly; Path=/; SameSite=Lax'

    expect(
      reportProblems(
        {
          console_errors: [],
          cross_origin_isolated: true,
          probes: [probe({ headers: { ...GOOD, 'set-cookie': cookie } })],
        },
        SET,
        RECORDS,
        policy,
      ),
    ).toStrictEqual([])
  })
})
