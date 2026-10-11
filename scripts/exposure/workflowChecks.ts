import { problem } from './shared.ts'
import assert from 'node:assert'

const EXPOSURE_STEP = /run:\s*pnpm exposure\S*/gu
const EXACT_STEP = /run:\s*pnpm exposure\s*$/mu

// The live gate reaches the host only when CI lets the runner out. Rule PROBE-03.
export const egressProblems = (
  workflowText: string,
  liveUrl: string,
): string[] => {
  assert(workflowText.length > 0)
  assert(typeof liveUrl === 'string')

  if (liveUrl.length === 0) {
    return []
  }

  const host = new URL(liveUrl).hostname

  assert(host.length > 0)

  return workflowText.includes(`${host}:443`)
    ? []
    : [
        problem(
          `the exposure workflow lets no traffic out to ${host}`,
          `Add ${host}:443 to allowed-endpoints in .github/workflows/exposure.yml`,
          'PROBE-03',
        ),
      ]
}

export const workflowProblems = (text: string): string[] => {
  assert(text.length > 0)

  const steps = [...text.matchAll(EXPOSURE_STEP)].length
  const problems: string[] = []

  if (steps !== 1) {
    problems.push(
      problem(
        `the exposure workflow has ${steps} exposure steps, and it must have 1`,
        'Keep one step, run: pnpm exposure',
        'ESOT-02',
      ),
    )
  } else if (!EXACT_STEP.test(text)) {
    problems.push(
      problem(
        'the exposure step of the workflow is not exactly `pnpm exposure`',
        'Set the step to run: pnpm exposure',
        'ESOT-02',
      ),
    )
  }

  if (text.includes('continue-on-error')) {
    problems.push(
      problem(
        'the exposure workflow holds continue-on-error',
        'Remove continue-on-error from the workflow',
        'ESOT-02',
      ),
    )
  }

  assert(problems.length <= 2)

  return problems
}
