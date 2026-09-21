import { type Policy } from './policyChecks.ts'
import { exists, type Outcome, readYaml } from './shared.ts'
import assert from 'node:assert'

type Pattern = {
  chosen_model?: string
  keys?: Record<string, string>
  native?: string
  role?: string
  source?: string
}

type PatternFile = {
  patterns: Record<string, Pattern>
  version: number
}

const patternShapeProblems = (file: PatternFile): string[] => {
  assert(typeof file.patterns === 'object')
  assert(file.version > 0)

  const problems: string[] = []

  for (const [name, pattern] of Object.entries(file.patterns)) {
    const keys = Object.keys(pattern.keys ?? {})

    if (keys.length === 0) {
      problems.push(`the pattern ${name} has no keys. Rule KEY-03.`)
    }

    if ((pattern.source ?? '').length === 0) {
      problems.push(`the pattern ${name} has no source. Rule KEY-03.`)
    }
  }

  return problems
}

const chosenModelProblems = (
  file: PatternFile,
  dualModel: string[],
): string[] => {
  assert(typeof file.patterns === 'object')
  assert(Array.isArray(dualModel))

  const problems: string[] = []

  for (const name of dualModel) {
    const pattern = file.patterns[name]

    if (pattern === undefined) {
      problems.push(
        `patterns.dual_model names ${name}, and the pattern file has no such pattern. Rule CON-06.`,
      )
      continue
    }

    if ((pattern.chosen_model ?? '').length === 0) {
      problems.push(
        `the pattern ${name} has two models in the APG and no chosen_model. Rule CON-06.`,
      )
    }
  }

  assert(problems.length <= dualModel.length)

  return problems
}

const patternProblems = (file: PatternFile, dualModel: string[]): string[] => {
  assert(typeof file.patterns === 'object')
  assert(Array.isArray(dualModel))

  return [
    ...patternShapeProblems(file),
    ...chosenModelProblems(file, dualModel),
  ]
}

export const checkKeyboard = (policy: Policy): Outcome => {
  assert(policy.patterns.file.length > 0)
  assert(policy.patterns.primitives_directory.length > 0)

  if (!exists(policy.patterns.file)) {
    return {
      notes: [],
      problems: [`${policy.patterns.file} is missing. Rule KEY-03.`],
    }
  }

  const file = readYaml<PatternFile>(policy.patterns.file)

  assert(typeof file.patterns === 'object')

  const problems = patternProblems(file, policy.patterns.dual_model)
  const count = Object.keys(file.patterns).length
  const notes = [
    `${count} patterns, ${policy.patterns.dual_model.length} of them with one chosen model`,
  ]

  if (!exists(policy.patterns.primitives_directory)) {
    notes.push(
      `${policy.patterns.primitives_directory} is missing, so the fuzz run and the consistency compare had nothing to read.`,
    )
  }

  assert(notes.length >= 1)

  return { notes, problems }
}
