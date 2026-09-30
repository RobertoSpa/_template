import { type Gate, runGates } from './gates.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'
import { checkLab } from './timing/lab.ts'
import { checkPolicy } from './timing/policy.ts'
import { type Policy } from './timing/shared.ts'

const GATES: Record<string, Gate<Policy>> = {
  lab: checkLab,
  policy: checkPolicy,
}

process.exitCode = await runGates(
  GATES,
  readPolicy<Policy>(POLICY_PATHS.timing),
  process.argv.slice(2),
)
