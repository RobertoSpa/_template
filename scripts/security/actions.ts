import { type Outcome } from '../gates.ts'
import { execute, readYaml, tail } from '../io.ts'
import { type Workflow, workflowProblems } from './actionsChecks.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'
import { readdirSync } from 'node:fs'

const WORKFLOWS_DIR = '.github/workflows'
const WORKFLOWS_MAX = 50
const ZIZMOR_FINDING_STATUS_MIN = 11
const ZIZMOR_FINDING_STATUS_MAX = 14

const toolProblems = (
  label: string,
  command: string,
  args: string[],
): string[] => {
  assert(label.length > 0)
  assert(command.length > 0)

  const result = execute(command, args)

  return result.status === 0 ? [] : [label, ...tail(result.output)]
}

const zizmorProblems = (persona: string): string[] => {
  assert(persona.length > 0)

  const result = execute('zizmor', [
    '--persona',
    persona,
    '--no-progress',
    WORKFLOWS_DIR,
  ])

  if (result.status === 0) {
    return []
  }

  const findings =
    result.status >= ZIZMOR_FINDING_STATUS_MIN &&
    result.status <= ZIZMOR_FINDING_STATUS_MAX

  assert(typeof findings === 'boolean')

  return [
    findings ? 'zizmor found a problem in a workflow' : 'zizmor failed',
    ...tail(result.output),
  ]
}

export const checkActions = (policy: Policy): Outcome => {
  assert(policy.actions.owners_allowed.length > 0)
  assert(policy.actions.zizmor_persona.length > 0)

  const names = readdirSync(WORKFLOWS_DIR).filter((name) =>
    name.endsWith('.yml'),
  )

  assert(names.length <= WORKFLOWS_MAX)

  const problems = names.flatMap((name) =>
    workflowProblems(
      policy.actions,
      name,
      readYaml<Workflow>(`${WORKFLOWS_DIR}/${name}`),
    ),
  )

  problems.push(
    ...toolProblems('pinact found an action that is not pinned', 'pinact', [
      'run',
      '--check',
    ]),
    ...toolProblems(
      'actionlint found a problem in a workflow',
      'actionlint',
      [],
    ),
    ...zizmorProblems(policy.actions.zizmor_persona),
  )

  return { notes: [], problems }
}
