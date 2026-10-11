import { type Outcome } from '../gates.ts'
import { exists, readText } from '../io.ts'
import { type Adapter, adapterProblems, adaptersOf } from './adapters.ts'
import { headerSetOf } from './headers.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const ADAPTERS_DIR = 'exposure/adapters'

const ADAPTERS_MAX = 10

const wantedOf = (policy: Policy): Adapter[] => {
  assert(Object.keys(policy.headers.fixed).length > 0)

  const wanted = adaptersOf(headerSetOf(policy.headers), policy.headers.cache)

  assert(wanted.length > 0)
  assert(wanted.length <= ADAPTERS_MAX)

  return wanted
}

const onDiskOf = (wanted: Adapter[]): Map<string, string> => {
  assert(wanted.length > 0)

  const found = new Map<string, string>()

  for (const { name } of wanted) {
    const path = join(ADAPTERS_DIR, name)

    if (exists(path)) {
      found.set(name, readText(path))
    }
  }

  assert(found.size <= wanted.length)

  return found
}

// Rule RED-02. Each adapter on disk equals the generated text.
export const checkAdapters = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)

  const wanted = wantedOf(policy)
  const problems = adapterProblems(wanted, onDiskOf(wanted))

  assert(problems.length <= ADAPTERS_MAX)

  return { notes: [`${wanted.length} adapters compared`], problems }
}

// pnpm exposure write. The one writer of the adapters.
export const writeAdapters = (policy: Policy): Outcome => {
  assert(policy.gates.length > 0)

  const wanted = wantedOf(policy)

  mkdirSync(ADAPTERS_DIR, { recursive: true })

  for (const { name, text } of wanted) {
    writeFileSync(join(ADAPTERS_DIR, name), text, 'utf8')
  }

  assert(onDiskOf(wanted).size === wanted.length)

  return {
    notes: wanted.map(({ name }) => `wrote ${join(ADAPTERS_DIR, name)}`),
    problems: [],
  }
}
