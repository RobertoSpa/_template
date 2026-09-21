import { parseRules } from '../rules.ts'
import {
  type Attestation,
  attestationProblems,
  type AttestContext,
  routeClass,
  type RouteRecord,
} from './attestChecks.ts'
import { type Policy } from './policyChecks.ts'
import { exists, type Outcome, readText, readYaml, today } from './shared.ts'
import assert from 'node:assert'

const RULES_PATH = 'docs/agents/accessibility.md'
const AGENT_NAMES = ['agent', 'assistant', 'claude', 'copilot', 'bot']
const ATTESTED = 'attested'

const readRoutes = (policy: Policy): RouteRecord[] => {
  assert(policy.criticality.file.length > 0)
  assert(policy.criticality.default.length > 0)

  if (!exists(policy.criticality.file)) {
    return []
  }

  const routes = readYaml<RouteRecord[]>(policy.criticality.file)

  assert(Array.isArray(routes))

  return routes
}

const classByRoute = (
  routes: RouteRecord[],
  policy: Policy,
): Record<string, string> => {
  assert(Array.isArray(routes))
  assert(policy.criticality.default.length > 0)

  const map: Record<string, string> = {}

  for (const route of routes) {
    const path = route.path ?? ''

    if (path.length > 0) {
      map[path] = routeClass(
        route,
        policy.criticality.axes,
        policy.criticality.default,
      )
    }
  }

  assert(Object.keys(map).length <= routes.length)

  return map
}

const dueNote = (routes: number, attested: number): string => {
  assert(routes >= 0)
  assert(attested > 0)

  if (routes === 0) {
    return `no route has a record, so no attestation is due. Each route makes ${attested} rules due.`
  }

  return `${routes} routes times ${attested} attested rules gives ${routes * attested} records that are due.`
}

export const checkAttest = (policy: Policy): Outcome => {
  assert(policy.attestation.file.length > 0)
  assert(policy.criticality.default.length > 0)

  if (!exists(policy.attestation.file)) {
    return {
      notes: [],
      problems: [`${policy.attestation.file} is missing. Rule ATT-01.`],
    }
  }

  const records = readYaml<Attestation[]>(policy.attestation.file)

  assert(Array.isArray(records))

  const routes = readRoutes(policy)
  const context: AttestContext = {
    agentNames: AGENT_NAMES,
    classByRoute: classByRoute(routes, policy),
    daysByClass: policy.criticality.attestation_days,
    defaultClass: policy.criticality.default,
    methods: policy.attestation.methods,
    today: today(),
  }
  const attested = parseRules(readText(RULES_PATH)).filter(
    (rule) => rule.layer === ATTESTED,
  )

  assert(attested.length > 0)

  return {
    notes: [
      `${records.length} live records`,
      dueNote(routes.length, attested.length),
    ],
    problems: attestationProblems(records, context),
  }
}
