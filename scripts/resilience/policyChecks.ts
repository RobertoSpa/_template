import { type Rule } from '../rules.ts'
import assert from 'node:assert'

export type Deviation = {
  approver?: string
  date?: string
  expiry?: string
  rationale?: string
  risk?: string
  route?: string
  rule?: string
}
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
const RECORDS_MAX = 1_000
const MS_PER_DAY = 86_400_000
const MESSAGE_LINE = /^\s+(\w+): '(.*)',$/u
const SENTENCE_END = /\. /u
const DEVIATION_FIELDS = [
  'approver',
  'date',
  'expiry',
  'rationale',
  'risk',
  'route',
  'rule',
] as const
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
      problems.push(`${file} has no constant ${name}. Rule SOT-01.`)

      continue
    }

    const found = valueOf(raw)

    if (String(found) !== String(value)) {
      problems.push(
        `${file} holds ${name} = ${[found].flat().join(', ')}, and the policy holds ${[value].flat().join(', ')}. Rule SOT-01.`,
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

export const safeDirectionProblems = (
  now: SafeNumbers,
  main: SafeNumbers,
): string[] => {
  assert(typeof now.network.timeout_ms === 'number')
  assert(typeof main.network.timeout_ms === 'number')

  const problems: string[] = []

  for (const [name, read] of SAFE_NUMBERS) {
    const before = read(main)
    const after = read(now)

    if (after > before) {
      problems.push(
        `${name} moves from ${before} to ${after}, the unsafe direction. Rule SOT-04 wants a deviation record.`,
      )
    }
  }

  return problems
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

const daysBetween = (from: string, to: string): number => {
  assert(from.length === 10)
  assert(to.length === 10)

  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY)
}

const recordProblems = (
  record: Deviation,
  index: number,
  rules: Rule[],
): string[] => {
  assert(index >= 0)
  assert(rules.length > 0)

  const problems: string[] = []

  for (const field of DEVIATION_FIELDS) {
    if ((record[field] ?? '').length === 0) {
      problems.push(`record ${index} has no ${field}. Rule DEV-01.`)
    }
  }

  const rule = rules.find((one) => one.id === record.rule)

  if (rule?.category === 'M') {
    problems.push(
      `record ${index} deviates from ${rule.id}, and a mandatory rule has no deviation. Rule DEV-01.`,
    )
  }

  return problems
}

export const deviationProblems = (
  records: Deviation[],
  rules: Rule[],
  maxDays: number,
  todayIso: string,
): string[] => {
  assert(records.length <= RECORDS_MAX)
  assert(maxDays > 0)

  const problems: string[] = []

  for (const [index, record] of records.entries()) {
    problems.push(...recordProblems(record, index, rules))

    const { date = '', expiry = '' } = record

    if (date.length !== 10 || expiry.length !== 10) {
      continue
    }

    if (expiry < todayIso) {
      problems.push(`record ${index} expired on ${expiry}. Rule DEV-01.`)
    }

    const days = daysBetween(date, expiry)

    if (days > maxDays) {
      problems.push(
        `record ${index} lives ${days} days, and deviation.max_days is ${maxDays}. Rule DEV-01.`,
      )
    }
  }

  return problems
}
