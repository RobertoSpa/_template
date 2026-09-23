import { isIdentifier, ruleLinesOf, type RuleSource } from './rules.ts'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const RULE_FILES = [
  'docs/agents/accessibility.md',
  'docs/agents/resilience.md',
  'docs/agents/security.md',
]
const USAGE = 'usage: pnpm explain <RULE-ID>, for example pnpm explain DEP-01'
const BULLET = /^- /u

const readSources = (): RuleSource[] => {
  assert(RULE_FILES.length > 0)

  const sources = RULE_FILES.map((file) => ({
    file,
    text: readFileSync(file, 'utf8'),
  }))

  assert(sources.length === RULE_FILES.length)

  return sources
}

const main = (argv: string[]): number => {
  assert(Array.isArray(argv))
  assert(argv.length < 100)

  const id = (argv[0] ?? '').toUpperCase()

  if (!isIdentifier(id)) {
    console.log(USAGE)

    return 1
  }

  const found = ruleLinesOf(readSources(), id)

  if (found.length === 0) {
    console.log(`${id} is not a rule of ${RULE_FILES.join(' or ')}.`)

    return 1
  }

  for (const rule of found) {
    console.log(rule.file)
    console.log(rule.line.replace(BULLET, ''))
  }

  return 0
}

process.exitCode = main(process.argv.slice(2))
