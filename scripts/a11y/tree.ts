import { type Outcome } from '../gates.ts'
import { exists, readYaml } from '../io.ts'
import { type RouteRecord } from './attestChecks.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'

const goldenProblems = (routes: RouteRecord[], directory: string): string[] => {
  assert(Array.isArray(routes))
  assert(directory.length > 0)

  const problems: string[] = []

  for (const route of routes) {
    const path = route.path ?? ''

    if (path.length === 0) {
      continue
    }

    const file = `${directory}/${path.replaceAll('/', '_')}.yaml`

    if (!exists(file)) {
      problems.push(
        `the route ${path} has no golden file at ${file}. A person writes it before the code. Rule EV-01.`,
      )
    }
  }

  return problems
}

export const checkTree = (policy: Policy): Outcome => {
  assert(policy.golden.aria_directory.length > 0)
  assert(policy.criticality.file.length > 0)

  if (!exists(policy.criticality.file)) {
    return {
      notes: [],
      problems: [`${policy.criticality.file} is missing. Rule CLS-01.`],
    }
  }

  const routes = readYaml<RouteRecord[]>(policy.criticality.file)

  assert(Array.isArray(routes))

  if (routes.length === 0) {
    return {
      notes: [
        'no route has a record, so axe, the aria golden files and the reflow run have nothing to read.',
      ],
      problems: [],
    }
  }

  const problems = goldenProblems(routes, policy.golden.aria_directory)

  assert(problems.length <= routes.length)

  return {
    notes: [`${routes.length} routes read`],
    problems,
  }
}
