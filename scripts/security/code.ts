import { type Outcome } from '../gates.ts'
import { execute, tail } from '../io.ts'
import { type Policy } from './policyChecks.ts'
import assert from 'node:assert'

export const checkCode = (policy: Policy): Outcome => {
  assert(Array.isArray(policy.gates))
  assert(policy.gates.includes('code'))

  const result = execute('pnpm', ['exec', 'eslint', '.', '--max-warnings', '0'])

  assert(typeof result.status === 'number')

  const problems =
    result.status === 0
      ? []
      : ['eslint found a problem or a warning', ...tail(result.output)]

  return { notes: [], problems }
}
