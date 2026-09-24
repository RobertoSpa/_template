import {
  codeRemovalProblems,
  codesOf,
  constantProblems,
  fallbackProblems,
  messageProblems,
  safeDirectionProblems,
} from './policyChecks.ts'
import { describe, expect, it } from 'vitest'

const CLIENT = [
  'const TIMEOUT_MS = 5_000',
  'export const RETRY_MAX = 2',
  "export const RETRY_METHODS = ['GET', 'HEAD']",
  '',
].join('\n')

const ERRORS = [
  'export const MESSAGES = {',
  "  malformed: 'The server sent data that the app cannot read. Reload the page.',",
  "  timeout: 'The server did not answer in time. Retry.',",
  '} as const',
  '',
].join('\n')

describe('constantProblems', () => {
  it('gives no problem when each constant agrees with the policy', () => {
    expect(
      constantProblems(CLIENT, 'client.ts', {
        RETRY_MAX: 2,
        RETRY_METHODS: ['GET', 'HEAD'],
        TIMEOUT_MS: 5_000,
      }),
    ).toStrictEqual([])
  })

  it.each([
    [
      'a number',
      { TIMEOUT_MS: 4_000 },
      'client.ts holds TIMEOUT_MS = 5000, and the policy holds 4000. Rule RSOT-01.',
    ],
    [
      'a list',
      { RETRY_METHODS: ['GET'] },
      'client.ts holds RETRY_METHODS = GET, HEAD, and the policy holds GET. Rule RSOT-01.',
    ],
    [
      'a missing constant',
      { BACKOFF_BASE_MS: 200 },
      'client.ts has no constant BACKOFF_BASE_MS. Rule RSOT-01.',
    ],
  ])('names %s that disagrees', (_name, wanted, problem) => {
    expect(constantProblems(CLIENT, 'client.ts', wanted)).toStrictEqual([
      problem,
    ])
  })
})

describe('codesOf', () => {
  it('reads each code of the message table', () => {
    expect(codesOf(ERRORS)).toStrictEqual(['malformed', 'timeout'])
  })
})

describe('messageProblems', () => {
  it('gives no problem for a message of two sentences', () => {
    expect(messageProblems(ERRORS)).toStrictEqual([])
  })

  it.each([
    [
      "  shed: 'The app is busy.',",
      'the code shed has a message of 1 sentence, and rule ERR-04 wants two.',
    ],
    [
      "  shed: 'The app is busy. Retry. Then reload.',",
      'the code shed has a message of 3 sentences, and rule ERR-04 wants two.',
    ],
    ["  shed: '',", 'the code shed has no message. Rule ERR-04.'],
  ])('names the message %s', (line, problem) => {
    const text = ERRORS.replace('} as const', `${line}\n} as const`)

    expect(messageProblems(text)).toStrictEqual([problem])
  })
})

describe('codeRemovalProblems', () => {
  it('gives no problem when each code of main stays', () => {
    expect(
      codeRemovalProblems(
        ['malformed', 'shed', 'timeout'],
        ['malformed', 'timeout'],
      ),
    ).toStrictEqual([])
  })

  it('names a code that main holds and the branch does not', () => {
    expect(
      codeRemovalProblems(['timeout'], ['malformed', 'timeout']),
    ).toStrictEqual([
      'the code malformed is on main and not on this branch. A code is never removed. Rule ERR-03.',
    ])
  })
})

describe('safeDirectionProblems', () => {
  const now = {
    boundary: { fallback_delay_ms: 5_000, max_resets: 3 },
    network: { retry_budget_per_tab: 10, retry_max: 2, timeout_ms: 5_000 },
  }

  it('gives no problem when each number stays or decreases', () => {
    expect(
      safeDirectionProblems(now, {
        boundary: { fallback_delay_ms: 5_000, max_resets: 4 },
        network: { retry_budget_per_tab: 10, retry_max: 2, timeout_ms: 6_000 },
      }),
    ).toStrictEqual([])
  })

  it('names a number that increases', () => {
    expect(
      safeDirectionProblems(now, {
        boundary: { fallback_delay_ms: 5_000, max_resets: 2 },
        network: { retry_budget_per_tab: 10, retry_max: 2, timeout_ms: 5_000 },
      }),
    ).toStrictEqual([
      'boundary.max_resets moves from 2 to 3, the unsafe direction. Rule RSOT-04 wants a deviation record.',
    ])
  })
})

describe('fallbackProblems', () => {
  const html =
    '<style>animation: fallback-appear 0s 5s forwards;</style><p class="fallback">The page cannot load.</p>'

  it('gives no problem when the text and the delay are in the page', () => {
    expect(
      fallbackProblems(html, 'The page cannot load.', 5_000),
    ).toStrictEqual([])
  })

  it('names a missing text', () => {
    expect(fallbackProblems(html, 'Other text.', 5_000)).toStrictEqual([
      'index.html does not hold the fallback text "Other text.". Rule BND-04.',
    ])
  })

  it('names a delay that disagrees', () => {
    expect(
      fallbackProblems(html, 'The page cannot load.', 3_000),
    ).toStrictEqual([
      'index.html does not hold the fallback delay 0s 3s. Rule BND-04.',
    ])
  })
})
