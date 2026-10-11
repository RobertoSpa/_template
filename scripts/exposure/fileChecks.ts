import { problem } from './shared.ts'
import assert from 'node:assert'

const LINES_MAX = 100_000
const RECORDS_MAX = 1_000
const DANGER_LINES = 5
const DANGER = 'DANGER:'
const RULE_LINE = /^- \*\*[A-Z]+-\d{2} \(/u
// A chat handle, a ticket number, and a memory are not a cause. Rule ESOT-07.
const PRIVATE_CAUSE = /@[a-z]|#\d|as agreed|see chat/iu

// The first lines of each configuration file name the danger. Rule ESOT-06.
export const dangerProblems = (files: Array<[string, string]>): string[] => {
  assert(files.length > 0)
  assert(files.length <= RECORDS_MAX)

  return files
    .filter(
      ([, text]) =>
        !text.split('\n').slice(0, DANGER_LINES).join('\n').includes(DANGER),
    )
    .map(([path]) =>
      problem(
        `${path} does not start with a ${DANGER} comment`,
        `Add a comment with ${DANGER} and the damage of an incorrect value to the top of ${path}`,
        'ESOT-06',
      ),
    )
}

export const causeProblems = (rulesText: string): string[] => {
  assert(rulesText.length > 0)

  const lines = rulesText.split('\n')

  assert(lines.length <= LINES_MAX)

  return lines
    .map((line, index): [string, number] => [line, index + 1])
    .filter(([line]) => RULE_LINE.test(line) && PRIVATE_CAUSE.test(line))
    .map(([, lineNumber]) =>
      problem(
        `docs/agents/exposure.md line ${lineNumber} cites a chat, a ticket, or a memory`,
        'Cite a public document or name the damage',
        'ESOT-07',
      ),
    )
}

export const identifierProblems = (
  now: Set<string>,
  base: Set<string>,
): string[] => {
  assert(now.size > 0)
  assert(base.size <= LINES_MAX)

  return [...base]
    .filter((id) => !now.has(id))
    .map((id) =>
      problem(
        `the rule ${id} is on origin/main and not in docs/agents/exposure.md`,
        `Put ${id} back with the layer retired`,
        'ESOT-05',
      ),
    )
}
