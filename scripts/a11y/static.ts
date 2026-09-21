import { type Policy } from './policyChecks.ts'
import { exists, type Outcome, readText } from './shared.ts'
import assert from 'node:assert'

const INDEX_PATH = 'index.html'
const BUILD_DIRECTORY = 'dist'
const ZOOM_BLOCKERS = ['user-scalable=no', 'user-scalable=0', 'maximum-scale']

const zoomProblems = (html: string): string[] => {
  assert(typeof html === 'string')
  assert(html.length > 0)

  const problems: string[] = []

  for (const blocker of ZOOM_BLOCKERS) {
    if (html.includes(blocker)) {
      problems.push(
        `${INDEX_PATH} holds ${blocker}, which blocks the zoom of the browser. Rule SIZE-07.`,
      )
    }
  }

  assert(problems.length <= ZOOM_BLOCKERS.length)

  return problems
}

export const checkStatic = (policy: Policy): Outcome => {
  assert(policy.eslint_jsx_a11y.length > 0)
  assert(Array.isArray(policy.gates))

  if (!exists(INDEX_PATH)) {
    return { notes: [], problems: [`${INDEX_PATH} is missing.`] }
  }

  const problems = zoomProblems(readText(INDEX_PATH))
  const notes = [
    `${policy.eslint_jsx_a11y.length} jsx-a11y rules run in pnpm lint`,
  ]

  if (!exists(BUILD_DIRECTORY)) {
    notes.push(
      `${BUILD_DIRECTORY} is missing, so html-validate did not run. Run pnpm build first.`,
    )
  }

  assert(notes.length >= 1)

  return { notes, problems }
}
