import { bundleBuildEnvironment, viteBuild } from './build.ts'
import assert from 'node:assert'

// The one build of dist for a human and for the webServer of playwright.config.ts. Rule BLD-02.
const DIST = 'dist'

const run = viteBuild(DIST, bundleBuildEnvironment())

assert(typeof run.status === 'number')
assert(typeof run.output === 'string')

if (run.status !== 0) {
  console.log(run.output.trimEnd())
}

process.exitCode = run.status
