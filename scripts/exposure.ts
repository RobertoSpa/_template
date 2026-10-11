import { checkAdapters, writeAdapters } from './exposure/adaptersGate.ts'
import { checkData } from './exposure/data.ts'
import { checkOutput } from './exposure/output.ts'
import { checkPolicy } from './exposure/policy.ts'
import { checkLive, checkProbe } from './exposure/probe.ts'
import { type Policy } from './exposure/shared.ts'
import { type Gate, runGates } from './gates.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'

const GATES: Record<string, Gate<Policy>> = {
  adapters: checkAdapters,
  data: checkData,
  live: checkLive,
  output: checkOutput,
  policy: checkPolicy,
  probe: checkProbe,
  write: writeAdapters,
}

process.exitCode = await runGates(
  GATES,
  readPolicy<Policy>(POLICY_PATHS.exposure),
  process.argv.slice(2),
)
