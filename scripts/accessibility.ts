import { checkAttest } from './a11y/attest.ts'
import { checkKeyboard } from './a11y/keyboard.ts'
import { checkPolicy } from './a11y/policy.ts'
import { type Policy } from './a11y/policyChecks.ts'
import { checkStatic } from './a11y/static.ts'
import { checkTokens } from './a11y/tokens.ts'
import { checkTree } from './a11y/tree.ts'
import { type Gate, runGates } from './gates.ts'
import { POLICY_PATHS, readPolicy } from './policies.ts'

const GATES: Record<string, Gate<Policy>> = {
  attest: checkAttest,
  keyboard: checkKeyboard,
  policy: checkPolicy,
  static: checkStatic,
  tokens: checkTokens,
  tree: checkTree,
}
process.exitCode = await runGates(
  GATES,
  readPolicy<Policy>(POLICY_PATHS.a11y),
  process.argv.slice(2),
)
