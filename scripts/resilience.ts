import { type Outcome } from './a11y/shared.ts'
import { checkFault } from './resilience/fault.ts'
import { checkPolicy } from './resilience/policy.ts'
import { checkRoutes } from './resilience/routes.ts'
import { type Gate, readPolicy } from './resilience/shared.ts'
import assert from 'node:assert'

const GATES: Record<string, Gate> = {
  fault: checkFault,
  policy: checkPolicy,
  routes: checkRoutes,
}
const GATES_MAX = 10
const GATE_NAMES = Object.keys(GATES).join(', ')

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
  assert(argv.length < GATES_MAX)

  const policy = readPolicy()
  const names = argv.length > 0 ? argv : policy.gates

  assert(names.length <= GATES_MAX)

  let failed = 0

  for (const name of names) {
    const gate = GATES[name]

    assert(gate !== undefined, `${name} is not a gate of ${GATE_NAMES}`)

    if (!report(name, gate(policy))) {
      failed += 1
    }
  }

  assert(failed <= names.length)

  return failed === 0 ? 0 : 1
}

process.exitCode = main(process.argv.slice(2))
