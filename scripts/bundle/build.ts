import { type Policy } from './shared.ts'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

export type Output = Map<string, Uint8Array>

const VITE = 'node_modules/vite/bin/vite.js'
const BUILD_BYTES_MAX = 64 * 1_024 * 1_024
const FILES_MAX = 10_000
const RUNS = 2

const build = (policy: Policy, outDirectory: string): string | undefined => {
  assert(outDirectory.length > 0)
  assert(Object.keys(policy.build.env).length > 0)

  const result = spawnSync(
    process.execPath,
    [
      VITE,
      'build',
      '--mode',
      'production',
      '--outDir',
      outDirectory,
      '--emptyOutDir',
      '--logLevel',
      'warn',
    ],
    {
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', ...policy.build.env },
      maxBuffer: BUILD_BYTES_MAX,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error !== undefined) {
    return `vite build did not start: ${result.error.message}. Rule FAIL-01.`
  }

  if (result.status !== 0) {
    return `vite build failed. Rule BLD-04.\n${result.stdout}${result.stderr}`
  }

  return undefined
}

const outputOf = (outDirectory: string): Output => {
  assert(existsSync(outDirectory))

  const files: Output = new Map()
  const entries = readdirSync(outDirectory, {
    recursive: true,
    withFileTypes: true,
  })

  assert(
    entries.length <= FILES_MAX,
    'the output has more than FILES_MAX files',
  )

  for (const entry of entries.filter((one) => one.isFile())) {
    const path = join(entry.parentPath, entry.name)

    files.set(relative(outDirectory, path), readFileSync(path))
  }

  assert(files.size > 0, 'the build wrote no file')

  return files
}

const hashOf = (bytes: Uint8Array): string => {
  assert(bytes.length <= BUILD_BYTES_MAX)

  const hash = createHash('sha256').update(bytes).digest('hex')

  assert(hash.length === 64)

  return hash
}

const sameOutputProblems = (first: Output, second: Output): string[] => {
  assert(first.size > 0)
  assert(second.size > 0)

  const names = [...new Set([...first.keys(), ...second.keys()])].toSorted()

  return names
    .filter((name) => {
      const one = first.get(name)
      const two = second.get(name)

      return (
        one === undefined || two === undefined || hashOf(one) !== hashOf(two)
      )
    })
    .map((name) => `${name} is different in the two builds. Rule BLD-01.`)
}

// Rules BLD-01, BLD-02, and BLD-06.
export const buildTwice = (
  policy: Policy,
): { output?: Output; problems: string[] } => {
  assert(RUNS === 2)

  const root = mkdtempSync(join(tmpdir(), 'bundle-'))
  const outputs: Output[] = []

  try {
    for (let run = 0; run < RUNS; run += 1) {
      const outDirectory = join(root, String(run))
      const failed = build(policy, outDirectory)

      if (failed !== undefined) {
        return { problems: [failed] }
      }

      outputs.push(outputOf(outDirectory))
    }
  } finally {
    rmSync(root, { force: true, recursive: true })
  }

  assert(outputs.length === RUNS)

  return {
    output: outputs[0],
    problems: sameOutputProblems(outputs[0], outputs[1]),
  }
}
