import { secretFileProblems } from './secretsChecks.ts'
import { describe, expect, it } from 'vitest'

const patterns = ['.env', '.env.local', '.env.*.local', '*.pem', 'id_rsa*']

describe('secretFileProblems', () => {
  it('accepts tracked files that match no pattern', () => {
    const tracked = [
      'src/app/main.tsx',
      '.env.example',
      'docs/pem.md',
      'environment.ts',
    ]

    expect(secretFileProblems(patterns, tracked)).toStrictEqual([])
  })

  it.each([
    ['.env', '.env matches the secret pattern .env'],
    [
      'config/.env.local',
      'config/.env.local matches the secret pattern .env.local',
    ],
    [
      '.env.staging.local',
      '.env.staging.local matches the secret pattern .env.*.local',
    ],
    ['certs/server.pem', 'certs/server.pem matches the secret pattern *.pem'],
    ['keys/id_rsa.pub', 'keys/id_rsa.pub matches the secret pattern id_rsa*'],
  ])('refuses the tracked file %s', (path, problem) => {
    expect(secretFileProblems(patterns, [path])).toStrictEqual([problem])
  })
})
