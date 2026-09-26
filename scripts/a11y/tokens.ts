import { type Outcome } from '../gates.ts'
import { exists, readYaml } from '../io.ts'
import { type Policy } from './policyChecks.ts'
import { pairProblems, targetProblems, type Tokens } from './tokensChecks.ts'
import assert from 'node:assert'

export const checkTokens = (policy: Policy): Outcome => {
  assert(policy.tokens.file.length > 0)
  assert(policy.contrast.text_min > 0)

  if (!exists(policy.tokens.file)) {
    return {
      notes: [],
      problems: [`${policy.tokens.file} is missing. Rule COLOR-01.`],
    }
  }

  const tokens = readYaml<null | Tokens>(policy.tokens.file)

  assert(tokens !== null, `${policy.tokens.file} is empty`)
  assert(Array.isArray(tokens.pairs))

  const problems = [
    ...pairProblems(tokens, policy.contrast),
    ...targetProblems(tokens, policy.target.min_css_px),
  ]
  const themes = Object.keys(tokens.themes).length

  return {
    notes: [
      `${tokens.pairs.length} pairs in ${themes} themes, proved at ${policy.contrast.text_min} to 1 for text`,
      'the APCA value is missing until apca-w3 is installed. Rule COLOR-07 is advisory.',
    ],
    problems,
  }
}
