import { checkActions } from './security/actions.ts'
import { checkCode } from './security/code.ts'
import { checkDeps } from './security/deps.ts'
import { checkPolicy } from './security/policy.ts'
import { checkSecrets } from './security/secrets.ts'
import { type Gate, type Outcome, readPolicy } from './security/shared.ts'
import assert from 'node:assert'

const GATES: Record<string, Gate> = {
  actions: checkActions,
  code: checkCode,
  deps: checkDeps,
  policy: checkPolicy,
  secrets: checkSecrets,
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
