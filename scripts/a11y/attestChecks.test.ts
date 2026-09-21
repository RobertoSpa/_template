import {
  type Attestation,
  attestationProblems,
  type AttestContext,
  routeClass,
  strictestClass,
} from './attestChecks.ts'
import { describe, expect, it } from 'vitest'

const AXES = {
  escape: { alternate_route: 'C3', assisted: 'C2', none: 'C1' },
  exposure: { common: 'C2', every_session: 'C1', rare: 'C3' },
  harm: { blocked: 'C1', degraded: 'C3', delayed: 'C2' },
}

const contextWith = (fields: Partial<AttestContext>): AttestContext => ({
  agentNames: ['agent', 'claude'],
  classByRoute: { '/checkout': 'C1' },
  daysByClass: { C1: 30, C2: 90, C3: 180 },
  defaultClass: 'C1',
  methods: ['analysis', 'demonstration', 'inspection', 'test'],
  today: '2026-09-20',
  ...fields,
})

const recordWith = (fields: Partial<Attestation>): Attestation => ({
  commit: 'c6bdea772f83',
  criterion: '1.4.1',
  date: '2026-09-15',
  method: 'inspection',
  observed: 'the error state shows a warning icon and the text "card declined"',
  route: '/checkout',
  signer: 'RobertoSpa',
  tree_hash: 'a1b2c3d4',
  ...fields,
})

describe('strictestClass', () => {
  it.each([
    {
      classes: ['C1', 'C2', 'C3'],
      name: 'takes C1 when one axis is C1',
      want: 'C1',
    },
    {
      classes: ['C3', 'C2', 'C3'],
      name: 'takes C2 when the worst axis is C2',
      want: 'C2',
    },
    {
      classes: ['C3', 'C3', 'C3'],
      name: 'takes C3 when each axis is C3',
      want: 'C3',
    },
  ])('$name', ({ classes, want }) => {
    expect(strictestClass(classes, 'C1')).toBe(want)
  })
})

describe('routeClass', () => {
  it('takes the strictest of the three axes', () => {
    const route = {
      escape: 'alternate_route',
      exposure: 'rare',
      harm: 'blocked',
    }

    expect(routeClass(route, AXES, 'C1')).toBe('C1')
  })

  it('takes C3 when each axis is the mildest value', () => {
    const route = {
      escape: 'alternate_route',
      exposure: 'rare',
      harm: 'degraded',
    }

    expect(routeClass(route, AXES, 'C1')).toBe('C3')
  })

  it('takes the strictest class when one axis is missing', () => {
    expect(routeClass({ harm: 'degraded' }, AXES, 'C1')).toBe('C1')
  })

  it('takes the strictest class when an axis holds a value that no axis names', () => {
    const route = { escape: 'none', exposure: 'rare', harm: 'unknown' }

    expect(routeClass(route, AXES, 'C1')).toBe('C1')
  })
})

describe('attestationProblems', () => {
  it('accepts a record that holds each field and is inside its life', () => {
    expect(
      attestationProblems([recordWith({})], contextWith({})),
    ).toStrictEqual([])
  })

  it('refuses a record that the agent signed', () => {
    const problems = attestationProblems(
      [recordWith({ signer: 'Claude Code' })],
      contextWith({}),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule ATT-04')
  })

  it.each([
    { observed: 'pass' },
    { observed: 'OK' },
    { observed: '   ' },
    { observed: 'done' },
  ])('refuses the observation $observed', ({ observed }) => {
    const problems = attestationProblems(
      [recordWith({ observed })],
      contextWith({}),
    )

    expect(problems.some((line) => line.includes('Rule ATT-05'))).toBe(true)
  })

  it('refuses a method that the policy does not hold', () => {
    const problems = attestationProblems(
      [recordWith({ method: 'vibes' })],
      contextWith({}),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule ATT-06')
  })

  it('accepts a record on the last day of its life', () => {
    const problems = attestationProblems(
      [recordWith({ date: '2026-08-21' })],
      contextWith({}),
    )

    expect(problems).toStrictEqual([])
  })

  it('refuses a record one day after its life ends', () => {
    const problems = attestationProblems(
      [recordWith({ date: '2026-08-20' })],
      contextWith({}),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Rule ATT-03')
  })

  it('gives a route with no record the strictest life', () => {
    const problems = attestationProblems(
      [recordWith({ date: '2026-08-20', route: '/unlisted' })],
      contextWith({}),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('the class C1 gives 30 days')
  })

  it('names each field that the record does not hold', () => {
    const problems = attestationProblems(
      [recordWith({ commit: '', tree_hash: '' })],
      contextWith({}),
    )

    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('has no commit')
    expect(problems[1]).toContain('has no tree_hash')
  })
})
