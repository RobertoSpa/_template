import assert from 'node:assert'
import { readdirSync, readFileSync } from 'node:fs'

const LIST_PATH = 'e2e/journeys.txt'
const SPEC_PATTERN = /\.e2e\.ts$/u
const JOURNEYS_MAX = 100

const readJourneyNames = () => {
  const lines = readFileSync(LIST_PATH, 'utf8').split('\n')

  assert(Array.isArray(lines))

  const names = lines
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0 && !line.startsWith('#'))

  assert(names.length <= JOURNEYS_MAX)

  return names
}

const readSpecNames = () => {
  const entries = readdirSync('e2e')

  assert(Array.isArray(entries))
  assert(entries.length <= JOURNEYS_MAX + 1)

  return entries
    .filter((entry: string) => SPEC_PATTERN.test(entry))
    .map((entry: string) => entry.replace(SPEC_PATTERN, ''))
}

const report = (label: string, names: string[]) => {
  assert(typeof label === 'string')
  assert(Array.isArray(names))

  if (names.length === 0) {
    return false
  }

  console.error(`${label}: ${names.join(', ')}`)

  return true
}

const main = () => {
  const journeys = readJourneyNames()
  const specs = readSpecNames()

  const missing = journeys.filter((name: string) => !specs.includes(name))
  const extra = specs.filter((name: string) => !journeys.includes(name))

  const bad = [
    report('A journey in e2e/journeys.txt has no e2e spec', missing),
    report('An e2e spec is not named in e2e/journeys.txt', extra),
  ].some(Boolean)

  if (!bad) {
    return
  }

  process.exit(1)
}

main()
