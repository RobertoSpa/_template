import { readYaml } from './io.ts'
import assert from 'node:assert'

export const POLICY_PATHS = {
  a11y: 'a11y/policy.yaml',
  bundle: 'bundle/policy.yaml',
  resilience: 'resilience/policy.yaml',
  security: 'security/policy.yaml',
} as const

export const readPolicy = <P extends { gates: string[] }>(path: string): P => {
  assert(path.endsWith('policy.yaml'))

  const policy = readYaml<null | P>(path)

  assert(policy !== null, `${path} holds no policy`)
  assert(Array.isArray(policy.gates))
  assert(policy.gates.length > 0)

  return policy
}
