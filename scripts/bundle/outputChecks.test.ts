import { mapProblems, moduleProblems, originProblems } from './outputChecks.ts'
import { describe, expect, it } from 'vitest'

describe('moduleProblems', () => {
  const REACT = '/r/node_modules/.pnpm/react@19.3.0/node_modules/react/index.js'
  const OLD = '/r/node_modules/.pnpm/react@18.0.0/node_modules/react/index.js'

  it('adds the raw bytes of each package', () => {
    expect(
      moduleProblems(
        { 'assets/a.js': { '/r/src/app/main.tsx': 5, [REACT]: 70 } },
        '/r',
        ['.test.'],
      ),
    ).toStrictEqual({ packages: { react: 70 }, problems: [] })
  })

  it('refuses two versions of one package', () => {
    expect(
      moduleProblems({ 'assets/a.js': { [OLD]: 1, [REACT]: 2 } }, '/r', [
        '.test.',
      ]).problems,
    ).toStrictEqual([
      'the output holds react@18.0.0 and react@19.3.0. Rule PKG-03.',
    ])
  })

  it('refuses a test module in a chunk', () => {
    expect(
      moduleProblems(
        { 'assets/a.js': { '/r/src/shared/lib/result.test.ts': 9 } },
        '/r',
        ['.test.'],
      ).problems,
    ).toStrictEqual([
      'assets/a.js holds src/shared/lib/result.test.ts, which is test code. Rule SHAKE-04.',
    ])
  })
})

describe('mapProblems', () => {
  it('passes a script with a map that the script does not name', () => {
    expect(
      mapProblems({ 'assets/a.js': 'let a' }, [
        'assets/a.js',
        'assets/a.js.map',
      ]),
    ).toStrictEqual([])
  })

  it('refuses a script with no map and a script that names its map', () => {
    expect(
      mapProblems(
        {
          'assets/a.js': 'let a',
          'assets/b.js': '//# sourceMappingURL=b.js.map',
        },
        ['assets/a.js', 'assets/b.js', 'assets/b.js.map'],
      ),
    ).toStrictEqual([
      'assets/a.js has no map. Rule MAP-01.',
      'assets/b.js names its map. Rule MAP-01.',
    ])
  })
})

describe('originProblems', () => {
  it.each([
    ['<script src="/assets/a.js">', []],
    [
      '<script src="https://cdn.example/a.js">',
      ['index.html loads a script from a different origin. Rule SPLIT-03.'],
    ],
    [
      'import("https://cdn.example/a.js")',
      ['index.html loads a script from a different origin. Rule SPLIT-03.'],
    ],
    [
      '<script src="//cdn.example/a.js">',
      ['index.html loads a script from a different origin. Rule SPLIT-03.'],
    ],
    [
      '<link rel="modulepreload" href="https://cdn.example/a.js">',
      ['index.html loads a script from a different origin. Rule SPLIT-03.'],
    ],
    [
      'importScripts("https://cdn.example/a.js")',
      ['index.html loads a script from a different origin. Rule SPLIT-03.'],
    ],
    ['<a href="/about">', []],
  ])('reads %s', (text, wanted) => {
    expect(originProblems({ 'index.html': text })).toStrictEqual(wanted)
  })
})
