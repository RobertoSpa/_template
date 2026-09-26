import { type Gate, runGates } from './gates.ts'
import { execute } from './io.ts'
import assert from 'node:assert'

type Policy = { gates: string[] }

const PIPELINES = ['a11y', 'security', 'resilience', 'bundle']

const pipeline =
  (name: string): Gate<Policy> =>
  () => {
    assert(PIPELINES.includes(name))

    const { output, status } = execute('pnpm', ['--silent', name])

    console.log(output.trimEnd())
    assert(Number.isInteger(status))

    return {
      notes: [],
      problems: status === 0 ? [] : [`pnpm ${name} exited with ${status}`],
    }
  }

process.exitCode = await runGates(
  Object.fromEntries(PIPELINES.map((name) => [name, pipeline(name)])),
  { gates: PIPELINES },
  process.argv.slice(2),
)
