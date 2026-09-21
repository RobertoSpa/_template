import { type Policy } from './policyChecks.ts'
import { exists, type Outcome, readYaml } from './shared.ts'
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

  const tokens = readYaml<Tokens>(policy.tokens.file)

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
