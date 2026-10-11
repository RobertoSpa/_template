import { type Execution } from './io.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'

const VITE = 'node_modules/vite/bin/vite.js'
const BUILD_BYTES_MAX = 64 * 1_024 * 1_024

export const BUILD_NOT_STARTED_STATUS = 127

// The env of each build is build.env of bundle/policy.yaml and the path. Rule BLD-02.
export const bundleBuildEnvironment = (): Record<string, string> => {
  const { build } = readPolicy<{
    build: { env: Record<string, string> }
    gates: string[]
  }>(POLICY_PATHS.bundle)

  assert(typeof build.env === 'object')
  assert(Object.keys(build.env).length > 0)

  return build.env
}

// The one vite build of the pipelines. Rule BLD-06.
export const viteBuild = (
  outDirectory: string,
  environment: Record<string, string>,
): Execution => {
  assert(outDirectory.length > 0)
  assert(Object.keys(environment).length > 0)

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
      env: { PATH: process.env.PATH ?? '', ...environment },
      maxBuffer: BUILD_BYTES_MAX,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error !== undefined) {
    return {
      output: `vite build did not start: ${result.error.message}`,
      status: BUILD_NOT_STARTED_STATUS,
    }
  }

  assert(result.status !== null, 'vite build ended by a signal')

  return { output: `${result.stdout}${result.stderr}`, status: result.status }
}
