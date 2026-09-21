import { checkAttest } from './a11y/attest.ts'
import { checkKeyboard } from './a11y/keyboard.ts'
import { checkPolicy } from './a11y/policy.ts'
import { type Gate, type Outcome, readPolicy } from './a11y/shared.ts'
import { checkStatic } from './a11y/static.ts'
import { checkTokens } from './a11y/tokens.ts'
import { checkTree } from './a11y/tree.ts'
import assert from 'node:assert'

const GATES: Record<string, Gate> = {
  attest: checkAttest,
  keyboard: checkKeyboard,
  policy: checkPolicy,
  static: checkStatic,
  tokens: checkTokens,
  tree: checkTree,
}
const GATES_MAX = 10

const report = (name: string, outcome: Outcome): boolean => {
  assert(name.length > 0)
  assert(Array.isArray(outcome.problems))

  const passed = outcome.problems.length === 0
  const lines = [
    ...outcome.notes.map((note) => `note: ${note}`),
    ...outcome.problems,
  ]

  console.log(`${passed ? 'go    ' : 'no-go '}${name}`)

  for (const line of lines) {
    console.log(`       ${line}`)
  }

  return passed
}

const main = (argv: string[]): number => {
  assert(Array.isArray(argv))

  const policy = readPolicy()
  const wanted = argv.length > 0 ? argv : policy.gates

  assert(wanted.length <= GATES_MAX)

  let failures = 0

  for (const name of wanted) {
    const gate = GATES[name]

    assert(
      gate !== undefined,
      `${name} is not a gate. The gates are: ${Object.keys(GATES).join(', ')}`,
    )

    failures += report(name, gate(policy)) ? 0 : 1
  }

  assert(failures <= wanted.length)

  return failures === 0 ? 0 : 1
}

process.exitCode = main(process.argv.slice(2))
