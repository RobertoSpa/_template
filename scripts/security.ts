import { type Gate, runGates } from './gates.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'
import { checkActions } from './security/actions.ts'
import { checkCode } from './security/code.ts'
import { checkDeps } from './security/deps.ts'
import { checkPolicy } from './security/policy.ts'
import { type Policy } from './security/policyChecks.ts'
import { checkSecrets } from './security/secrets.ts'

const GATES: Record<string, Gate<Policy>> = {
  actions: checkActions,
  code: checkCode,
  deps: checkDeps,
  policy: checkPolicy,
  secrets: checkSecrets,
}
process.exitCode = await runGates(
  GATES,
  readPolicy<Policy>(POLICY_PATHS.security),
  process.argv.slice(2),
)
