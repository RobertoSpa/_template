import {
  budgetOf,
  fileLimitProblems,
  growthProblems,
  routeProblems,
  sizesFileProblems,
  sizesTextOf,
} from './sizeChecks.ts'
import { describe, expect, it } from 'vitest'

const STAGE = {
  lock_from: 'measured',
  margin: { analysis: 30, estimate: 50, measured: 20, released: 5 },
  order: ['estimate', 'analysis', 'measured', 'released'],
  slack_bytes: 100,
}
const CEILING = { css: 1_000, js: 1_000, loaded: 3_000, total: 3_000 }
const ROUTE = {
  budget: { css: 500, js: 500, loaded: 1_500, total: 1_500 },
  owner: 'RobertoSpa',
  path: '/',
  stage: 'estimate',
}
const SCRIPT = {
  compress: true,
  extensions: ['.js'],
  max_raw: 200,
  max_wire: 100,
  rule: 'BUD-05',
}
const FONT = {
  compress: false,
  extensions: ['.woff2'],
  max_raw: 50,
  max_wire: 50,
  rule: 'BUD-06',
}

const sizesWith = (wire: number) => ({
  files: { 'assets/index.js': { raw: wire, wire } },
  packages: {},
  routes: { '/': { css: 0, js: wire, loaded: wire, total: wire } },
  total: { raw: wire, wire },
})

describe('budgetOf', () => {
  it('adds the wire bytes of the first load, and of each file that the route can load', () => {
    expect(
      budgetOf(
        ['assets/a.js', 'assets/b.css', 'index.html'],
        ['assets/a.js', 'assets/b.css', 'assets/lazy.js', 'index.html'],
        {
          'assets/a.js': { raw: 90, wire: 30 },
          'assets/b.css': { raw: 40, wire: 10 },
          'assets/lazy.js': { raw: 70, wire: 20 },
          'index.html': { raw: 20, wire: 5 },
        },
      ),
    ).toStrictEqual({ css: 10, js: 30, loaded: 65, total: 45 })
  })
})

describe('fileLimitProblems', () => {
  it.each([
    [100, 200, []],
    [
      101,
      200,
      [
        'assets/index.js has 101 wire bytes, and files.script.max_wire is 100. Rule BUD-05.',
      ],
    ],
    [
      100,
      201,
      [
        'assets/index.js has 201 raw bytes, and files.script.max_raw is 200. Rule BUD-05.',
      ],
    ],
  ])('a script of %i wire and %i raw bytes gives %j', (wire, raw, wanted) => {
    expect(
      fileLimitProblems(
        { 'assets/index.js': { raw, wire } },
        { 'assets/index.js': 'script' },
        { script: SCRIPT },
        [],
      ),
    ).toStrictEqual(wanted)
  })

  it('names the rule of a renamed script group', () => {
    expect(
      fileLimitProblems(
        { 'assets/index.js': { raw: 200, wire: 101 } },
        { 'assets/index.js': 'chunk' },
        { chunk: SCRIPT },
        [],
      ),
    ).toStrictEqual([
      'assets/index.js has 101 wire bytes, and files.chunk.max_wire is 100. Rule BUD-05.',
    ])
  })

  it('names BUD-06 for a group that is not the script group', () => {
    expect(
      fileLimitProblems(
        { 'assets/a.woff2': { raw: 51, wire: 51 } },
        { 'assets/a.woff2': 'font' },
        { font: FONT },
        [],
      ),
    ).toStrictEqual([
      'assets/a.woff2 has 51 wire bytes, and files.font.max_wire is 50. Rule BUD-06.',
      'assets/a.woff2 has 51 raw bytes, and files.font.max_raw is 50. Rule BUD-06.',
    ])
  })

  it('passes a file that has a deviation record for its rule', () => {
    expect(
      fileLimitProblems(
        { 'assets/index.js': { raw: 999, wire: 999 } },
        { 'assets/index.js': 'script' },
        { script: SCRIPT },
        [{ place: 'assets/index.js', rule: 'BUD-05' }],
      ),
    ).toStrictEqual([])
  })
})

describe('routeProblems', () => {
  it('passes a route inside its budget and its ceiling', () => {
    expect(
      routeProblems(
        { '/': { css: 500, js: 500, loaded: 1_500, total: 1_500 } },
        { ceiling: CEILING, routes: [ROUTE], stage: STAGE },
        [],
      ),
    ).toStrictEqual([])
  })

  it('refuses a route one byte over its budget', () => {
    expect(
      routeProblems(
        { '/': { css: 0, js: 501, loaded: 501, total: 501 } },
        { ceiling: CEILING, routes: [ROUTE], stage: STAGE },
        [],
      ),
    ).toStrictEqual([
      '/ has 501 js wire bytes, and its budget is 500. Rule BUD-02.',
    ])
  })

  it('passes a route over its budget with a BUD-02 record', () => {
    expect(
      routeProblems(
        { '/': { css: 0, js: 501, loaded: 501, total: 501 } },
        { ceiling: CEILING, routes: [ROUTE], stage: STAGE },
        [{ place: '/', rule: 'BUD-02' }],
      ),
    ).toStrictEqual([])
  })

  it('refuses a route over the ceiling, with a record or not', () => {
    expect(
      routeProblems(
        { '/': { css: 0, js: 1_001, loaded: 1_001, total: 1_001 } },
        {
          ceiling: CEILING,
          routes: [
            {
              ...ROUTE,
              budget: { css: 0, js: 2_000, loaded: 2_000, total: 2_000 },
            },
          ],
          stage: STAGE,
        },
        [{ place: '/', rule: 'BUD-02' }],
      ),
    ).toStrictEqual([
      '/ has 1001 js wire bytes, and ceiling.js is 1000. Rule BUD-01.',
    ])
  })

  it('refuses a locked route with more free space than stage.slack_bytes', () => {
    expect(
      routeProblems(
        { '/': { css: 400, js: 399, loaded: 1_400, total: 1_400 } },
        {
          ceiling: CEILING,
          routes: [{ ...ROUTE, stage: 'measured' }],
          stage: STAGE,
        },
        [],
      ),
    ).toStrictEqual([
      '/ uses 399 of a js budget of 500. The free space is more than stage.slack_bytes 100. Run pnpm bundle:write. Rule BUD-03.',
    ])
  })

  it('does not lock a route before stage.lock_from', () => {
    expect(
      routeProblems(
        { '/': { css: 0, js: 0, loaded: 0, total: 0 } },
        { ceiling: CEILING, routes: [ROUTE], stage: STAGE },
        [],
      ),
    ).toStrictEqual([])
  })

  it('refuses a route that the build does not measure', () => {
    expect(
      routeProblems(
        {},
        { ceiling: CEILING, routes: [ROUTE], stage: STAGE },
        [],
      ),
    ).toStrictEqual(['the build gives no size for the route /. Rule FAIL-01.'])
  })
})

describe('growthProblems', () => {
  it.each([
    [1_000, 1_100, []],
    [
      1_000,
      1_101,
      [
        'the branch adds 101 wire bytes to main, and growth.branch_max_bytes is 100. Rule GROW-01.',
      ],
    ],
  ])('from %i to %i wire bytes gives %j', (base, now, wanted) => {
    expect(
      growthProblems(sizesWith(now), sizesWith(base), 100, []),
    ).toStrictEqual(wanted)
  })

  it('refuses one added byte while a BUD-02 record is live', () => {
    expect(
      growthProblems(sizesWith(1_001), sizesWith(1_000), 100, [
        { place: '/', rule: 'BUD-02' },
      ]),
    ).toStrictEqual([
      'the branch adds 1 wire bytes while a BUD-02 record is live. Rule GROW-02.',
    ])
  })

  it('passes a decrease while a BUD-02 record is live', () => {
    expect(
      growthProblems(sizesWith(999), sizesWith(1_000), 100, [
        { place: '/', rule: 'BUD-02' },
      ]),
    ).toStrictEqual([])
  })
})

describe('sizes.json', () => {
  it('writes the keys in alphabetical sequence', () => {
    expect(
      sizesTextOf({
        files: { a: { raw: 4, wire: 3 }, b: { raw: 2, wire: 1 } },
        packages: {},
        routes: {},
        total: { raw: 6, wire: 4 },
      }),
    ).toBe(
      `${JSON.stringify(
        {
          files: { a: { raw: 4, wire: 3 }, b: { raw: 2, wire: 1 } },
          packages: {},
          routes: {},
          total: { raw: 6, wire: 4 },
        },
        null,
        2,
      )}\n`,
    )
  })

  it.each([
    ['{}\n', '{}\n', []],
    [
      '{}\n',
      '{ }\n',
      [
        'bundle/sizes.json disagrees with the build. Run pnpm bundle:write. Rule BSOT-05.',
      ],
    ],
    [
      '{}\n',
      undefined,
      ['bundle/sizes.json is missing. Run pnpm bundle:write. Rule BSOT-05.'],
    ],
  ])('compares %j with %j', (measured, committed, wanted) => {
    expect(
      sizesFileProblems(measured, committed, 'bundle/sizes.json'),
    ).toStrictEqual(wanted)
  })
})
