import { type Outcome } from './a11y/shared.ts'
import assert from 'node:assert'

// The one runner of each pipeline. `pnpm <pipeline>` and `pnpm <pipeline>:<gate>` call it.
type Gates<P> = Record<string, (policy: P) => Outcome | Promise<Outcome>>

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

export const runGates = async <P extends { gates: string[] }>(
  gates: Gates<P>,
  policy: P,
  argv: string[],
): Promise<number> => {
  assert(Array.isArray(argv))
  assert(Object.keys(gates).length <= GATES_MAX)

  const wanted = argv.length > 0 ? argv : policy.gates
  let failures = 0

  assert(wanted.length <= GATES_MAX)

  for (const name of wanted) {
    // hasOwn, so a name that each object has, such as constructor, is not a gate.
    assert(
      Object.hasOwn(gates, name),
      `${name} is not a gate. The gates are: ${Object.keys(gates).join(', ')}`,
    )

    const gate = gates[name]

    failures += report(name, await gate(policy)) ? 0 : 1
  }

  assert(failures <= wanted.length)

  return failures === 0 ? 0 : 1
}
