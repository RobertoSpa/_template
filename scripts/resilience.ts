import { type Gate, runGates } from './gates.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'
import { checkFault } from './resilience/fault.ts'
import { checkPolicy } from './resilience/policy.ts'
import { checkRoutes } from './resilience/routes.ts'
import { type Policy } from './resilience/shared.ts'

const GATES: Record<string, Gate<Policy>> = {
  fault: checkFault,
  policy: checkPolicy,
  routes: checkRoutes,
}
process.exitCode = await runGates(
  GATES,
  readPolicy<Policy>(POLICY_PATHS.resilience),
  process.argv.slice(2),
)
