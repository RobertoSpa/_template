import {
  pageComponentProblems,
  recordProblems,
  unnamedModuleProblems,
  unrecordedPages,
} from './routesChecks.ts'
import { describe, expect, it } from 'vitest'

const MODES = ['normal', 'reduced', 'read-only', 'static']
const MODULES = ['httpClient', 'report']
const PAGES = ['checkout', 'home']
const RECORD = {
  core: 'The user sees the cart.',
  dependencies: ['httpClient'],
  page: 'checkout',
  path: '/checkout',
  safe_mode: 'read-only',
}

describe('recordProblems', () => {
  it('gives no problem for a complete record', () => {
    expect(recordProblems([RECORD], PAGES, MODES, MODULES)).toStrictEqual([])
  })

  it.each([
    [
      { page: 'cart' },
      'record 0 names the page cart, and src/pages/ has no such folder. Rule SAFE-01.',
    ],
    [
      { path: 'checkout' },
      'record 0 has the path checkout, and a path starts with /. Rule SAFE-01.',
    ],
    [{ core: '' }, 'record 0 has no core function. Rule SAFE-01.'],
    [
      { safe_mode: 'normal' },
      'record 0 has the safe mode normal, and the safe mode is not normal. Rule SAFE-02.',
    ],
    [
      { safe_mode: 'off' },
      'record 0 has the safe mode off, and routes.modes has no such mode. Rule SAFE-02.',
    ],
    [
      { dependencies: ['cache'] },
      'record 0 names the dependency cache, and src/shared/infrastructure/ has no such module. Rule SAFE-01.',
    ],
  ])('names the defect of %o', (change, problem) => {
    expect(
      recordProblems([{ ...RECORD, ...change }], PAGES, MODES, MODULES),
    ).toStrictEqual([problem])
  })

  it('names two records of one page', () => {
    expect(
      recordProblems([RECORD, RECORD], PAGES, MODES, MODULES),
    ).toStrictEqual([
      'record 1 names the page checkout a second time. Rule SAFE-01.',
    ])
  })
})

describe('unnamedModuleProblems', () => {
  it('gives no problem when no page exists', () => {
    expect(unnamedModuleProblems([], MODULES, 0)).toStrictEqual([])
  })

  it('names a module that no record names when a page exists', () => {
    expect(unnamedModuleProblems([RECORD], MODULES, 2)).toStrictEqual([
      'no record names the module report. A dependency with no fault case is a failed dependency. Rule FIT-02.',
    ])
  })
})

describe('unrecordedPages', () => {
  it('lists each page with no record', () => {
    expect(unrecordedPages([RECORD], PAGES)).toStrictEqual(['home'])
  })
})

describe('pageComponentProblems', () => {
  it('gives no problem when each page has one route component', () => {
    expect(
      pageComponentProblems({
        checkout: ['CheckoutPage.tsx'],
        home: ['HomePage.tsx'],
      }),
    ).toStrictEqual([])
  })

  it.each([
    [
      { home: [] },
      'src/pages/home has no file of the shape ui/*Page.tsx, so no boundary of the level route exists. Rule BND-01.',
    ],
    [
      { home: ['HomePage.tsx', 'OtherPage.tsx'] },
      'src/pages/home has 2 files of the shape ui/*Page.tsx, and the route component is one file. Rule BND-01.',
    ],
  ])('names the defect of %o', (components, problem) => {
    expect(pageComponentProblems(components)).toStrictEqual([problem])
  })
})
