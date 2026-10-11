import { bundleBuildEnvironment, viteBuild } from '../build.ts'
import { type Outcome } from '../gates.ts'
import { execute, exists, readText, tail, today } from '../io.ts'
import { readRecords } from '../routes.ts'
import { hostProblems } from './dataChecks.ts'
import {
  indexProblems,
  manifestOf,
  type OutputFile,
  securityTxtProblems,
  servedOf,
  servedProblems,
} from './outputChecks.ts'
import { type Policy, problem, type RouteRecord } from './shared.ts'
import assert from 'node:assert'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const FILES_MAX = 10_000
const ENV_PREFIX = /envPrefix/u
const VITE_CONFIG = 'vite.config.ts'
const GITLEAKS_ARGS = ['dir', '--no-banner', '--redact', '--exit-code', '1']
const PUBLIC = 'public'
const TEXT_FILE = /\.(?:js|html|json|txt|xml|webmanifest)$/u
const decoder = new TextDecoder()

const build = (outDirectory: string): string[] => {
  assert(outDirectory.length > 0)
  assert(VITE_CONFIG.length > 0)

  const run = viteBuild(outDirectory, bundleBuildEnvironment())

  if (run.status === 0) {
    return []
  }

  return [
    problem(
      'vite build failed',
      'Read the lines below and correct the build',
      'OUT-01',
    ),
    ...tail(run.output),
  ]
}

const filesOf = (outDirectory: string): OutputFile[] => {
  assert(exists(outDirectory))

  const entries = readdirSync(outDirectory, {
    recursive: true,
    withFileTypes: true,
  })

  assert(entries.length <= FILES_MAX)

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name)

      return { bytes: readFileSync(path), path: relative(outDirectory, path) }
    })
}

// Rule OUT-05. A missing gitleaks is a gate that passed nothing.
const gitleaksProblems = (outDirectory: string, config: string): string[] => {
  assert(outDirectory.length > 0)
  assert(config.endsWith('.toml'))

  const run = execute('gitleaks', [
    ...GITLEAKS_ARGS,
    '--config',
    config,
    outDirectory,
  ])

  if (run.status === 0) {
    return []
  }

  return [
    problem(
      `gitleaks found a secret in ${outDirectory}, or did not run`,
      'Read the lines below, remove the secret, and rotate it',
      'OUT-05',
    ),
    ...tail(run.output),
  ]
}

const configProblems = (): string[] => {
  assert(exists(VITE_CONFIG))
  assert(VITE_CONFIG.length > 0)

  return ENV_PREFIX.test(readText(VITE_CONFIG))
    ? [
        problem(
          `${VITE_CONFIG} sets envPrefix`,
          `Remove envPrefix from ${VITE_CONFIG}`,
          'OUT-09',
        ),
      ]
    : []
}

const writeManifest = (path: string, served: OutputFile[]): string => {
  assert(path.endsWith('.json'))
  assert(served.length > 0)

  const entries = manifestOf(served)

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')

  assert(exists(path))

  return `${entries.length} served files in ${path}`
}

const nonPublicPathsOf = (policy: Policy): string[] => {
  assert(policy.routes.file.length > 0)
  assert(PUBLIC.length > 0)

  const paths = readRecords<RouteRecord>(policy.routes.file)
    .filter((record) => record.audience !== PUBLIC)
    .map((record) => record.path)

  assert(paths.length <= FILES_MAX)

  return paths
}

const securityTxtOf = (
  served: OutputFile[],
  path: string,
): string | undefined => {
  assert(path.length > 0)
  assert(served.length <= FILES_MAX)

  const found = served.find((file) => file.path === path)

  return found === undefined ? undefined : decoder.decode(found.bytes)
}

export const checkOutput = (policy: Policy): Outcome => {
  assert(policy.output.dir.length > 0)
  assert(policy.output.skip.length > 0)

  const failed = build(policy.output.dir)

  if (failed.length > 0) {
    return { notes: [], problems: failed }
  }

  const served = servedOf(filesOf(policy.output.dir), policy.output.skip)
  const problems = [
    ...servedProblems(
      served,
      policy.output,
      policy.headers.csp['style-src'] ?? [],
    ),
    ...indexProblems(served, nonPublicPathsOf(policy)),
    ...hostProblems(
      policy.data.kind,
      policy.data.hosts,
      served
        .filter((file) => TEXT_FILE.test(file.path))
        .map((file) => [file.path, decoder.decode(file.bytes)]),
    ),
    ...(policy.live.url.length > 0
      ? securityTxtProblems(
          securityTxtOf(served, policy.output.security_txt.path),
          policy.output.security_txt,
          today(),
        )
      : []),
    ...configProblems(),
    ...gitleaksProblems(policy.output.dir, policy.output.gitleaks_config),
  ]

  assert(served.length <= FILES_MAX)

  return {
    notes: [writeManifest(policy.output.manifest, served)],
    problems,
  }
}
