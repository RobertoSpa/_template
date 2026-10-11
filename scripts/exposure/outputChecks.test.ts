import {
  indexProblems,
  manifestOf,
  type OutputFile,
  securityTxtProblems,
  servedOf,
  servedProblems,
} from './outputChecks.ts'
import { styleHashProblems } from './styleChecks.ts'
import { describe, expect, it } from 'vitest'

const encoder = new TextEncoder()
const file = (path: string, text = 'x'): OutputFile => ({
  bytes: encoder.encode(text),
  path,
})
const OUTPUT = {
  dir: 'dist',
  dot_allowed: ['.well-known'],
  file_bytes_max: 100,
  files_max: 3,
  gitleaks_config: 'exposure/gitleaks.toml',
  manifest: 'reports/exposure/manifest.json',
  security_txt: {
    expires_days_max: 365,
    expires_days_min: 30,
    path: '.well-known/security.txt',
  },
  served_extensions: ['.html', '.js', '.txt'],
  skip: ['.map', '.vite/'],
}
const SECURITY_TXT = {
  expires_days_max: 365,
  expires_days_min: 30,
  path: '.well-known/security.txt',
}

describe('servedOf', () => {
  it('removes each map and each file of .vite/', () => {
    const files = [
      file('index.html'),
      file('assets/index-BZxIwzb4.js'),
      file('assets/index-BZxIwzb4.js.map'),
      file('.vite/manifest.json'),
    ]

    expect(servedOf(files, OUTPUT.skip).map(({ path }) => path)).toStrictEqual([
      'index.html',
      'assets/index-BZxIwzb4.js',
    ])
  })
})

describe('servedProblems', () => {
  it('gives no problem for a hashed asset and an html file', () => {
    expect(
      servedProblems(
        [
          file(
            'index.html',
            '<script type="module" src="/assets/index-BZxIwzb4.js"></script>',
          ),
          file('assets/index-BZxIwzb4.js'),
        ],
        OUTPUT,
        ["'self'"],
      ),
    ).toStrictEqual([])
  })

  it.each([
    [
      file('backup.sql'),
      [
        'backup.sql has the extension .sql, which is not in output.served_extensions. Do: Remove backup.sql from the build. Rule OUT-01.',
      ],
    ],
    [
      file('.env'),
      [
        '.env has the extension , which is not in output.served_extensions. Do: Remove .env from the build. Rule OUT-01.',
        '.env has the segment .env, and a dot segment is not served. Do: Remove .env from the build. Rule OUT-02.',
      ],
    ],
    [file('.well-known/security.txt'), []],
    [
      file('assets/logo.js'),
      [
        'assets/logo.js has no content hash in its name. Do: Let Vite name assets/logo.js with a hash. Rule OUT-04.',
      ],
    ],
    [
      file('index.html', '<script>alert(1)</script>'),
      [
        'index.html holds an inline script body. Do: Move the script to a file in assets/. Rule OUT-03.',
      ],
    ],
    [
      file('index.html', '<body onload="go()">'),
      [
        'index.html holds an attribute that starts with on. Do: Attach the handler in the script. Rule OUT-03.',
      ],
    ],
    [
      file('index.html', '<a href="javascript:void(0)">'),
      [
        'index.html holds a javascript: URL. Do: Replace the URL with a handler in the script. Rule OUT-03.',
      ],
    ],
    [
      file(
        'index.html',
        '<meta http-equiv="Content-Security-Policy" content="x">',
      ),
      [
        'index.html holds a meta tag with http-equiv. Do: Remove the meta tag, the header carries the policy. Rule OUT-03.',
      ],
    ],
    [
      file('index.html', 'x'.repeat(101)),
      [
        'index.html has 101 bytes, and output.file_bytes_max is 100. Do: Make index.html smaller. Rule OUT-04.',
      ],
    ],
    [
      file('assets/a-BZxIwzb4.js', 'const k = "sb_secret_abcdefghij"'),
      [
        'assets/a-BZxIwzb4.js holds a Supabase secret key. Do: Remove the secret from assets/a-BZxIwzb4.js and rotate it. Rule DATA-07.',
      ],
    ],
    [
      file('assets/a-BZxIwzb4.js', 'postgres://admin:hunter2@db.example/app'),
      [
        'assets/a-BZxIwzb4.js holds a URL with a password. Do: Remove the secret from assets/a-BZxIwzb4.js and rotate it. Rule DATA-07.',
      ],
    ],
    [
      file('assets/a-BZxIwzb4.js', '-----BEGIN RSA PRIVATE KEY-----'),
      [
        'assets/a-BZxIwzb4.js holds a private key block. Do: Remove the secret from assets/a-BZxIwzb4.js and rotate it. Rule DATA-07.',
      ],
    ],
    [
      file(
        'assets/a-BZxIwzb4.js',
        `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString('base64url')}.c2lnbmF0dXJlc2ln`,
      ),
      [
        'assets/a-BZxIwzb4.js holds a JSON web token with the role service_role. Do: Remove the token from assets/a-BZxIwzb4.js and rotate it. Rule DATA-07.',
      ],
    ],
    [
      file(
        'assets/a-BZxIwzb4.js',
        `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"anon"}').toString('base64url')}.c2lnbmF0dXJlc2ln`,
      ),
      [],
    ],
  ])('names the defects of %o', (one, lines) => {
    expect(servedProblems([one], OUTPUT, ["'self'"])).toStrictEqual(lines)
  })

  it('refuses a served set over files_max', () => {
    const served = ['a', 'b', 'c', 'd'].map((name) => file(`${name}.txt`))

    expect(servedProblems(served, OUTPUT, ["'self'"])).toStrictEqual([
      'the served set has 4 files, and output.files_max is 3. Do: Remove the files that no page loads. Rule OUT-04.',
    ])
  })
})

describe('styleHashProblems', () => {
  const html = '<style>#root>.fallback{opacity:0}</style>'
  const hash = "'sha256-y7fESd3Z3gl2yoRbM6UPvuNSDZNirMOUVkhfyQjVAK0='"

  it('gives no problem when the one style has its hash in style-src', () => {
    expect(
      styleHashProblems('index.html', html, ["'self'", hash]),
    ).toStrictEqual([])
  })

  it('refuses a style with no hash in style-src', () => {
    expect(styleHashProblems('index.html', html, ["'self'"])).toStrictEqual([
      `index.html holds a style tag with the hash ${hash}, and headers.csp.style-src does not list it. Do: Add ${hash} to headers.csp.style-src in exposure/policy.yaml. Rule OUT-03.`,
    ])
  })

  it('refuses a hash with no style', () => {
    expect(
      styleHashProblems('index.html', '<p>x</p>', ["'self'", hash]),
    ).toStrictEqual([
      `headers.csp.style-src lists ${hash}, and no style tag of index.html has that hash. Do: Remove ${hash} from headers.csp.style-src in exposure/policy.yaml. Rule OUT-03.`,
    ])
  })
})

describe('indexProblems', () => {
  it('gives no problem when the two files name public routes only', () => {
    expect(
      indexProblems(
        [
          file('robots.txt', 'Disallow: /tmp/'),
          file('sitemap.xml', '<loc>https://a.example/</loc>'),
        ],
        ['/account'],
      ),
    ).toStrictEqual([])
  })

  it('refuses a non-public route in robots.txt and in the sitemap', () => {
    expect(
      indexProblems(
        [
          file('robots.txt', 'Disallow: /account'),
          file('sitemap.xml', '<loc>https://a.example/account</loc>'),
        ],
        ['/account'],
      ),
    ).toStrictEqual([
      'robots.txt names /account, a route of a non-public audience. Do: Remove /account from robots.txt. Rule ROUTE-07.',
      'sitemap.xml names https://a.example/account, a route of a non-public audience. Do: Remove https://a.example/account from sitemap.xml. Rule ROUTE-07.',
    ])
  })
})

describe('securityTxtProblems', () => {
  const good =
    'Contact: mailto:security@a.example\nExpires: 2026-12-01T00:00:00Z\n'

  it('gives no problem for a file that expires in 51 days', () => {
    expect(securityTxtProblems(good, SECURITY_TXT, '2026-10-11')).toStrictEqual(
      [],
    )
  })

  it.each([
    [
      undefined,
      [
        'the served set has no .well-known/security.txt. Do: Write public/.well-known/security.txt with a Contact line and an Expires line. Rule OUT-08.',
      ],
    ],
    [
      'Expires: 2026-12-01T00:00:00Z\n',
      [
        '.well-known/security.txt has no Contact line. Do: Add a Contact line with a mailto: or https: URL. Rule OUT-08.',
      ],
    ],
    [
      'Contact: mailto:a@b.c\n',
      [
        '.well-known/security.txt has no Expires line with a date. Do: Add an Expires line with an ISO 8601 date. Rule OUT-08.',
      ],
    ],
    [
      'Contact: mailto:a@b.c\nExpires: 2026-11-09T00:00:00Z\n',
      [
        '.well-known/security.txt expires in 29 days, and the window is 30 to 365. Do: Set Expires to a date between 30 and 365 days from today. Rule OUT-08.',
      ],
    ],
    ['Contact: mailto:a@b.c\nExpires: 2026-11-10T00:00:00Z\n', []],
    [
      'Contact: mailto:a@b.c\nExpires: 2027-10-12T00:00:00Z\n',
      [
        '.well-known/security.txt expires in 366 days, and the window is 30 to 365. Do: Set Expires to a date between 30 and 365 days from today. Rule OUT-08.',
      ],
    ],
  ])('names the defects of %j', (text, lines) => {
    expect(securityTxtProblems(text, SECURITY_TXT, '2026-10-11')).toStrictEqual(
      lines,
    )
  })
})

describe('manifestOf', () => {
  it('gives each file with its hash, in alphabetical sequence', () => {
    expect(
      manifestOf([file('index.html', 'abc'), file('assets/a.js', 'abc')]),
    ).toStrictEqual([
      {
        bytes: 3,
        path: 'assets/a.js',
        sha256:
          'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      },
      {
        bytes: 3,
        path: 'index.html',
        sha256:
          'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      },
    ])
  })
})
