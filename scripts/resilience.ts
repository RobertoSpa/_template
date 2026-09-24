import { runGates } from './gates.ts'
import { checkFault } from './resilience/fault.ts'
import { checkPolicy } from './resilience/policy.ts'
import { checkRoutes } from './resilience/routes.ts'
import { type Gate, readPolicy } from './resilience/shared.ts'

const GATES: Record<string, Gate> = {
  fault: checkFault,
  policy: checkPolicy,
  routes: checkRoutes,
}
process.exitCode = await runGates(GATES, readPolicy(), process.argv.slice(2))
