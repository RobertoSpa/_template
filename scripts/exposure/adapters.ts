import { type Header } from './headers.ts'
import { type Policy, problem } from './shared.ts'
import assert from 'node:assert'

// One generated file per host syntax. Rule RED-02.
export type Adapter = { name: string; text: string }
type Render = (set: Header[], cache: Policy['headers']['cache']) => string

const HEADERS_MAX = 50
const DANGER =
  'DANGER: a generated file. A hand edit is a second copy of the header set.'
const SOURCE = 'Source: exposure/policy.yaml. Run: pnpm exposure write.'
const ASSET_PATH = '/assets/*'

const lines = (set: Header[], indent: string, separator: string): string[] => {
  assert(set.length > 0)
  assert(set.length <= HEADERS_MAX)

  return set.map(([name, value]) => `${indent}${name}${separator}${value}`)
}

// Netlify and Cloudflare Pages read public/_headers. One block per path.
const underscoreHeaders: Render = (set, cache) => {
  assert(set.length > 0)
  assert(cache.other.length > 0)

  return [
    `# ${DANGER}`,
    `# ${SOURCE}`,
    '/*',
    ...lines(set, '  ', ': '),
    `  cache-control: ${cache.other}`,
    ASSET_PATH,
    `  cache-control: ${cache.hashed}`,
    '',
  ].join('\n')
}

// Vercel reads vercel.json. JSON holds no comment, so the gate is the guard.
const vercelJson: Render = (set, cache) => {
  assert(set.length > 0)
  assert(cache.hashed.length > 0)

  const record = (source: string, headers: Header[]) => ({
    headers: headers.map(([key, value]) => ({ key, value })),
    source,
  })

  return `${JSON.stringify(
    {
      headers: [
        record('/(.*)', [...set, ['cache-control', cache.other]]),
        record('/assets/(.*)', [['cache-control', cache.hashed]]),
      ],
    },
    null,
    2,
  )}\n`
}

// nginx drops each add_header on a 4xx without always, and a regex location
// inherits none. Each location repeats the set. Rule HDR-01.
const nginxConfig: Render = (set, cache) => {
  assert(set.length > 0)
  assert(cache.other.length > 0)

  const always = lines(set, '    add_header ', ' "').map(
    (line) => `${line}" always;`,
  )
  const location = (matcher: string, cacheControl: string, body: string) => [
    `location ${matcher} {`,
    ...always,
    `    add_header cache-control "${cacheControl}" always;`,
    body,
    '}',
  ]

  return [
    `# ${DANGER}`,
    `# ${SOURCE}`,
    'server_tokens off;',
    ...location('~ /\\.', cache.other, '    return 404;'),
    ...location('~ \\.map$', cache.other, '    return 404;'),
    ...location('/assets/', cache.hashed, '    try_files $uri =404;'),
    ...location('/', cache.other, '    try_files $uri $uri/ /index.html;'),
    '',
  ].join('\n')
}

// The hidden paths answer 404 before the asset header, so a map gets no-cache.
const caddyfile: Render = (set, cache) => {
  assert(set.length > 0)
  assert(cache.other.length > 0)

  return [
    `# ${DANGER}`,
    `# ${SOURCE}`,
    '@hidden path /.* /*/.* *.map',
    'respond @hidden 404',
    'header {',
    ...lines(set, '    ', ' "').map((line) => `${line}"`),
    `    cache-control "${cache.other}"`,
    '    -server',
    '}',
    '@asset {',
    `    path ${ASSET_PATH}`,
    '    not path *.map',
    '}',
    `header @asset cache-control "${cache.hashed}"`,
    '',
  ].join('\n')
}

const RENDERS: Array<[string, Render]> = [
  ['Caddyfile', caddyfile],
  ['_headers', underscoreHeaders],
  ['nginx.conf', nginxConfig],
  ['vercel.json', vercelJson],
]

export const adaptersOf = (
  set: Header[],
  cache: Policy['headers']['cache'],
): Adapter[] => {
  assert(set.length > 0)
  assert(RENDERS.length > 0)

  const adapters = RENDERS.map(([name, render]) => ({
    name,
    text: render(set, cache),
  }))

  assert(adapters.length === RENDERS.length)

  return adapters
}

// Each file on disk equals the generated text, byte for byte. Rule RED-02.
export const adapterProblems = (
  wanted: Adapter[],
  onDisk: Map<string, string>,
): string[] => {
  assert(wanted.length > 0)
  assert(onDisk.size <= HEADERS_MAX)

  return wanted.flatMap(({ name, text }) => {
    const found = onDisk.get(name)

    if (found === undefined) {
      return [
        problem(
          `exposure/adapters/${name} is missing`,
          'Run pnpm exposure write',
          'RED-02',
        ),
      ]
    }

    if (found === text) {
      return []
    }

    return [
      problem(
        `exposure/adapters/${name} is different from the generated text`,
        'Run pnpm exposure write, and do not edit the file by hand',
        'RED-02',
      ),
    ]
  })
}
