import { type Limits } from '../directions.ts'
import assert from 'node:assert'

export type SafeNumbers = {
  boundary: { fallback_delay_ms: number; max_resets: number }
  network: {
    retry_budget_per_tab: number
    retry_max: number
    timeout_ms: number
  }
}
type Wanted = Record<string, number | string[]>

const CONSTANT_MAX = 100
const CODE_MAX = 1_000
const MESSAGE_LINE = /^\s+(\w+): '(.*)',$/u
const SENTENCE_END = /\. /u
const SAFE_NUMBERS: Array<[string, (numbers: SafeNumbers) => number]> = [
  [
    'boundary.fallback_delay_ms',
    (numbers) => numbers.boundary.fallback_delay_ms,
  ],
  ['boundary.max_resets', (numbers) => numbers.boundary.max_resets],
  [
    'network.retry_budget_per_tab',
    (numbers) => numbers.network.retry_budget_per_tab,
  ],
  ['network.retry_max', (numbers) => numbers.network.retry_max],
  ['network.timeout_ms', (numbers) => numbers.network.timeout_ms],
]

const constantOf = (text: string, name: string): string | undefined => {
  assert(name.length > 0)

  const found = new RegExp(`^(?:export )?const ${name} = (.+)$`, 'mu').exec(
    text,
  )

  return found?.[1]
}

const valueOf = (raw: string): number | string[] => {
  assert(raw.length > 0)

  if (raw.startsWith('[')) {
    return [...raw.matchAll(/'([^']*)'/gu)].map((match) => match[1] ?? '')
  }

  const number = Number(raw.replaceAll('_', ''))

  assert(!Number.isNaN(number), `${raw} is not a number and not a list`)

  return number
}

export const constantProblems = (
  text: string,
  file: string,
  wanted: Wanted,
): string[] => {
  assert(file.length > 0)
  assert(Object.keys(wanted).length <= CONSTANT_MAX)

  const problems: string[] = []

  for (const [name, value] of Object.entries(wanted)) {
    const raw = constantOf(text, name)

    if (raw === undefined) {
      problems.push(`${file} has no constant ${name}. Rule RSOT-01.`)

      continue
    }

    const found = valueOf(raw)

    if (String(found) !== String(value)) {
      problems.push(
        `${file} holds ${name} = ${[found].flat().join(', ')}, and the policy holds ${[value].flat().join(', ')}. Rule RSOT-01.`,
      )
    }
  }

  return problems
}

const messageLines = (text: string): Array<[string, string]> => {
  assert(text.length > 0)

  const lines: Array<[string, string]> = []

  for (const line of text.split('\n')) {
    const found = MESSAGE_LINE.exec(line)

    if (found !== null) {
      lines.push([found[1] ?? '', found[2] ?? ''])
    }
  }

  assert(lines.length <= CODE_MAX)

  return lines
}

export const codesOf = (text: string): string[] => {
  const codes = messageLines(text).map(([code]) => code)

  assert(codes.length <= CODE_MAX)

  return codes
}

export const messageProblems = (text: string): string[] => {
  const problems: string[] = []

  for (const [code, message] of messageLines(text)) {
    if (message.length === 0) {
      problems.push(`the code ${code} has no message. Rule ERR-04.`)

      continue
    }

    const count = message.split(SENTENCE_END).length

    if (count !== 2) {
      problems.push(
        `the code ${code} has a message of ${count} sentence${count === 1 ? '' : 's'}, and rule ERR-04 wants two.`,
      )
    }
  }

  assert(problems.length <= CODE_MAX)

  return problems
}

export const codeRemovalProblems = (
  now: string[],
  main: string[],
): string[] => {
  assert(now.length <= CODE_MAX)
  assert(main.length <= CODE_MAX)

  const present = new Set(now)

  return main
    .filter((code) => !present.has(code))
    .map(
      (code) =>
        `the code ${code} is on main and not on this branch. A code is never removed. Rule ERR-03.`,
    )
}

// A larger number in the resilience policy is the unsafe direction. Rule RSOT-04.
export const limitsOf = (numbers: SafeNumbers): Limits => {
  assert(typeof numbers.network.timeout_ms === 'number')

  const limits: Limits = {
    lists: [],
    numbers: SAFE_NUMBERS.map(([name, read]) => [
      name,
      read(numbers),
      'smaller',
    ]),
  }

  assert(limits.numbers.length === SAFE_NUMBERS.length)

  return limits
}

export const fallbackProblems = (
  html: string,
  text: string,
  delayMs: number,
): string[] => {
  assert(text.length > 0)
  assert(delayMs > 0)

  const problems: string[] = []
  const delay = `0s ${delayMs / 1_000}s`

  if (!html.includes(text)) {
    problems.push(
      `index.html does not hold the fallback text "${text}". Rule BND-04.`,
    )
  }

  if (!html.includes(delay)) {
    problems.push(
      `index.html does not hold the fallback delay ${delay}. Rule BND-04.`,
    )
  }

  return problems
}
