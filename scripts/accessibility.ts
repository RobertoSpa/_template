import { checkAttest } from './a11y/attest.ts'
import { checkKeyboard } from './a11y/keyboard.ts'
import { checkPolicy } from './a11y/policy.ts'
import { type Gate, readPolicy } from './a11y/shared.ts'
import { checkStatic } from './a11y/static.ts'
import { checkTokens } from './a11y/tokens.ts'
import { checkTree } from './a11y/tree.ts'
import { runGates } from './gates.ts'

const GATES: Record<string, Gate> = {
  attest: checkAttest,
  keyboard: checkKeyboard,
  policy: checkPolicy,
  static: checkStatic,
  tokens: checkTokens,
  tree: checkTree,
}
process.exitCode = await runGates(GATES, readPolicy(), process.argv.slice(2))
