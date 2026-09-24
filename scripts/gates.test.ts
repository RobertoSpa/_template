import { runGates } from './gates.ts'
import { describe, expect, it } from 'vitest'

const GATES = {
  broken: () => ({ notes: [], problems: ['the check failed. Rule DEV-01.'] }),
  clean: () => ({ notes: ['1 file read'], problems: [] }),
  later: async () => ({ notes: [], problems: [] }),
}

describe('runGates', () => {
  it('runs the gates of the policy when no gate is named, and gives 0 when each is go', async () => {
    expect(await runGates(GATES, { gates: ['clean', 'later'] }, [])).toBe(0)
  })

  it('gives 1 when one named gate is no-go', async () => {
    expect(
      await runGates(GATES, { gates: ['clean'] }, ['clean', 'broken']),
    ).toBe(1)
  })

  it('refuses a name that is not a gate, also a name that every object has', async () => {
    await expect(
      runGates(GATES, { gates: ['clean'] }, ['constructor']),
    ).rejects.toThrow('constructor is not a gate')
  })
})
