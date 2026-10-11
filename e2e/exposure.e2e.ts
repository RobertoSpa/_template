import {
  type ManifestEntry,
  type Policy,
  type Probe,
  type ProbeKind,
  type RouteRecord,
} from '../scripts/exposure/shared.ts'
import { type APIRequestContext, expect, test } from '@playwright/test'
import assert from 'node:assert'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'

type Ask = {
  headers?: Record<string, string>
  kind: ProbeKind
  method: string
  path: string
}
type Target = { url: string }

const POLICY_PATH = 'exposure/policy.yaml'
const TARGET_PATH = 'reports/exposure/target.json'
const ROOT = '/'
const PROBES_MAX = 1_000
const MANIFEST_MAX = 50
const OTHER_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
const UNKNOWN: Array<[ProbeKind, string]> = [
  ['unknown_file', '/exposure-unknown-file.js'],
  ['unknown_file', '/assets/exposure-unknown.css'],
  ['unknown_page', '/exposure-unknown-page'],
]
const BYPASS_HEADER = {
  'x-middleware-subrequest': 'middleware:middleware:middleware:middleware',
}

const policy = parseYaml(readFileSync(POLICY_PATH, 'utf8')) as Policy
const records =
  (parseYaml(readFileSync(policy.routes.file, 'utf8')) as
    null | RouteRecord[]) ?? []
const manifest = existsSync(policy.output.manifest)
  ? (JSON.parse(
      readFileSync(policy.output.manifest, 'utf8'),
    ) as ManifestEntry[])
  : []
const target = existsSync(TARGET_PATH)
  ? (JSON.parse(readFileSync(TARGET_PATH, 'utf8')) as Target)
  : { url: '' }
const probes: Probe[] = []
let crossOriginIsolated = false
const consoleErrors: string[] = []
const CONSOLE_ERRORS_MAX = 100

assert(records.length > 0)
assert(manifest.length <= PROBES_MAX)

const otherMethodOf = (record: RouteRecord): string => {
  assert(record.path.startsWith(ROOT))

  const listed = record.methods ?? policy.routes.methods_default
  const found = OTHER_METHODS.find((method) => !listed.includes(method))

  assert(found !== undefined, `${record.path} lists each method`)

  return found
}

const asksOf = (): Ask[] => {
  assert(records.length > 0)

  const asks: Ask[] = [
    ...records.flatMap((record): Ask[] => [
      { kind: 'route', method: 'GET', path: record.path },
      { kind: 'route', method: 'HEAD', path: record.path },
      { kind: 'method', method: otherMethodOf(record), path: record.path },
      {
        headers: BYPASS_HEADER,
        kind: 'bypass',
        method: 'GET',
        path: record.path,
      },
    ]),
    ...policy.probe.paths.map((path): Ask => ({
      kind: 'probe_path',
      method: 'GET',
      path,
    })),
    ...UNKNOWN.map(([kind, path]): Ask => ({ kind, method: 'GET', path })),
    {
      headers: { origin: policy.probe.foreign_origin },
      kind: 'cors',
      method: 'GET',
      path: ROOT,
    },
    ...manifest
      .filter((entry) => entry.path.startsWith('assets/'))
      .slice(0, MANIFEST_MAX)
      .flatMap((entry): Ask[] => [
        { kind: 'manifest', method: 'GET', path: `/${entry.path}` },
        ...(entry.path.endsWith('.js')
          ? [
              {
                kind: 'map' as const,
                method: 'GET',
                path: `/${entry.path}.map`,
              },
            ]
          : []),
      ]),
  ]

  assert(asks.length <= PROBES_MAX)

  return asks
}

const probeOf = async (
  request: APIRequestContext,
  ask: Ask,
): Promise<Probe> => {
  assert(ask.path.startsWith(ROOT))
  assert(ask.method.length > 0)

  const response = await request.fetch(`${target.url}${ask.path}`, {
    headers: ask.headers ?? {},
    maxRedirects: 0,
    method: ask.method,
  })
  const body = await response.body()
  const names = response
    .headersArray()
    .map((header) => header.name.toLowerCase())
  const repeated = [
    ...new Set(names.filter((name, index) => names.indexOf(name) !== index)),
  ]

  return {
    body_sha256: createHash('sha256').update(body).digest('hex'),
    headers: response.headers(),
    kind: ask.kind,
    method: ask.method,
    path: ask.path,
    repeated,
    status: response.status(),
  }
}

for (const ask of asksOf()) {
  test(`${ask.kind}: ${ask.method} ${ask.path} answers`, async ({
    request,
  }) => {
    const probe = await probeOf(request, ask)

    probes.push(probe)

    expect(probe.status).toBeGreaterThan(0)
  })
}

test('the page of / reads crossOriginIsolated', async ({ page }) => {
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      consoleErrors.length < CONSOLE_ERRORS_MAX
    ) {
      consoleErrors.push(message.text())
    }
  })
  await page.goto(`${target.url}${ROOT}`, { waitUntil: 'load' })

  crossOriginIsolated = await page.evaluate(
    () => globalThis.crossOriginIsolated,
  )

  expect(typeof crossOriginIsolated).toBe('boolean')
})

test.afterAll(() => {
  assert(probes.length <= PROBES_MAX)

  mkdirSync(dirname(policy.probe.report), { recursive: true })
  writeFileSync(
    policy.probe.report,
    `${JSON.stringify(
      {
        console_errors: consoleErrors,
        cross_origin_isolated: crossOriginIsolated,
        probes,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  assert(existsSync(policy.probe.report))
})
