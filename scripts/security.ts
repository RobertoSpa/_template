import { runGates } from './gates.ts'
import { checkActions } from './security/actions.ts'
import { checkCode } from './security/code.ts'
import { checkDeps } from './security/deps.ts'
import { checkPolicy } from './security/policy.ts'
import { checkSecrets } from './security/secrets.ts'
import { type Gate, readPolicy } from './security/shared.ts'

const GATES: Record<string, Gate> = {
  actions: checkActions,
  code: checkCode,
  deps: checkDeps,
  policy: checkPolicy,
  secrets: checkSecrets,
}
process.exitCode = await runGates(GATES, readPolicy(), process.argv.slice(2))
