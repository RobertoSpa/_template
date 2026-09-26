import {
  countOf,
  groupsOf,
  hashlessName,
  loadedFilesOf,
  type Manifest,
  packageOf,
  pageKeysOf,
  routeFilesOf,
  staticFilesOf,
} from './measure.ts'
import { brotliCompressSync, constants } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const FILES = {
  image: {
    allowed_other: ['favicon.ico'],
    compress: false,
    extensions: ['.avif', '.webp'],
    max_raw: 100,
    max_wire: 100,
    rule: 'BUD-06',
  },
  script: {
    compress: true,
    extensions: ['.js'],
    max_raw: 100,
    max_wire: 100,
    rule: 'BUD-05',
  },
}

const MANIFEST: Manifest = {
  '_shared-AAAAAAAA.js': { file: 'assets/shared-AAAAAAAA.js' },
  'index.html': {
    css: ['assets/index-BBBBBBBB.css'],
    dynamicImports: ['src/pages/home/ui/Home.tsx'],
    file: 'assets/index-CCCCCCCC.js',
    imports: ['_shared-AAAAAAAA.js'],
    isEntry: true,
    src: 'index.html',
  },
  'src/pages/home/ui/Chart.tsx': {
    file: 'assets/Chart-FFFFFFFF.js',
    isDynamicEntry: true,
    src: 'src/pages/home/ui/Chart.tsx',
  },
  'src/pages/home/ui/Home.tsx': {
    assets: ['assets/logo-DDDDDDDD.svg'],
    dynamicImports: ['src/pages/home/ui/Chart.tsx'],
    file: 'assets/Home-EEEEEEEE.js',
    imports: ['_shared-AAAAAAAA.js'],
    isDynamicEntry: true,
    src: 'src/pages/home/ui/Home.tsx',
  },
}

describe('hashlessName', () => {
  it.each([
    ['assets/index-BxT4k9aQ.js', 'assets/index.js'],
    ['assets/a-b-c-DEAD_bee.css', 'assets/a-b-c.css'],
    ['index.html', 'index.html'],
    ['assets/short-abc.js', 'assets/short-abc.js'],
    ['site-manifest.json', 'site-manifest.json'],
    ['icon-maskable.svg', 'icon-maskable.svg'],
  ])('names %s as %s', (name, wanted) => {
    expect(hashlessName(name)).toBe(wanted)
  })
})

describe('countOf', () => {
  it('counts a binary file as its size on the wire', () => {
    expect(countOf(new Uint8Array(37), false, 11)).toStrictEqual({
      raw: 37,
      wire: 37,
    })
  })

  it('counts a text file as its Brotli size on the wire', () => {
    const bytes = new TextEncoder().encode('const a = 1;\n'.repeat(200))
    const wire = brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length

    expect(countOf(bytes, true, 11)).toStrictEqual({ raw: 2_600, wire })
  })
})

describe('groupsOf', () => {
  it.each([
    ['assets/index.js', ['script']],
    ['assets/photo.webp', ['image']],
    ['favicon.ico', ['image']],
    ['assets/photo.png', []],
  ])('puts %s in %j', (name, wanted) => {
    expect(groupsOf(name, FILES)).toStrictEqual(wanted)
  })
})

describe('the tree of a route', () => {
  it('holds the static imports, the CSS, and the assets only', () => {
    expect(
      staticFilesOf(MANIFEST, ['index.html', 'src/pages/home/ui/Home.tsx']),
    ).toStrictEqual([
      'assets/Home-EEEEEEEE.js',
      'assets/index-BBBBBBBB.css',
      'assets/index-CCCCCCCC.js',
      'assets/logo-DDDDDDDD.svg',
      'assets/shared-AAAAAAAA.js',
    ])
  })

  it('holds the dynamic imports when the route loads each chunk', () => {
    expect(loadedFilesOf(MANIFEST, ['index.html'])).toStrictEqual([
      'assets/Chart-FFFFFFFF.js',
      'assets/Home-EEEEEEEE.js',
      'assets/index-BBBBBBBB.css',
      'assets/index-CCCCCCCC.js',
      'assets/logo-DDDDDDDD.svg',
      'assets/shared-AAAAAAAA.js',
    ])
  })

  const TWO_PAGES: Manifest = {
    ...MANIFEST,
    'index.html': {
      ...MANIFEST['index.html'],
      dynamicImports: [
        'src/pages/home/ui/Home.tsx',
        'src/pages/settings/ui/Settings.tsx',
      ],
    },
    'src/pages/settings/ui/Settings.tsx': {
      file: 'assets/Settings-GGGGGGGG.js',
      isDynamicEntry: true,
      src: 'src/pages/settings/ui/Settings.tsx',
    },
  }

  it('gives the shell route the shell only, and no chunk of a page', () => {
    expect(routeFilesOf(TWO_PAGES, undefined)).toStrictEqual({
      loaded: [
        'index.html',
        'assets/index-BBBBBBBB.css',
        'assets/index-CCCCCCCC.js',
        'assets/shared-AAAAAAAA.js',
      ],
      names: [
        'index.html',
        'assets/index-BBBBBBBB.css',
        'assets/index-CCCCCCCC.js',
        'assets/shared-AAAAAAAA.js',
      ],
      problems: [],
    })
  })

  it('gives a page route its own lazy chunks, and no chunk of a different page', () => {
    expect(routeFilesOf(TWO_PAGES, 'home')).toStrictEqual({
      loaded: [
        'index.html',
        'assets/Chart-FFFFFFFF.js',
        'assets/Home-EEEEEEEE.js',
        'assets/index-BBBBBBBB.css',
        'assets/index-CCCCCCCC.js',
        'assets/logo-DDDDDDDD.svg',
        'assets/shared-AAAAAAAA.js',
      ],
      names: [
        'index.html',
        'assets/Home-EEEEEEEE.js',
        'assets/index-BBBBBBBB.css',
        'assets/index-CCCCCCCC.js',
        'assets/logo-DDDDDDDD.svg',
        'assets/shared-AAAAAAAA.js',
      ],
      problems: [],
    })
  })

  it('refuses a page folder that the router does not load', () => {
    expect(routeFilesOf(TWO_PAGES, 'about').problems).toStrictEqual([
      'src/pages/about has 0 dynamic entries that the router loads, and it must have 1. Rule SPLIT-01.',
    ])
  })

  it('finds the dynamic entry that a module outside the page loads', () => {
    expect(pageKeysOf(MANIFEST, 'home')).toStrictEqual([
      'src/pages/home/ui/Home.tsx',
    ])
    expect(pageKeysOf(MANIFEST, 'settings')).toStrictEqual([])
  })
})

describe('packageOf', () => {
  it.each([
    [
      '/repo/node_modules/.pnpm/react@19.3.0/node_modules/react/index.js',
      { instance: 'react@19.3.0', name: 'react' },
    ],
    [
      '/repo/node_modules/.pnpm/@scope+ui@1.0.0_react@19.3.0/node_modules/@scope/ui/dist/a.js',
      { instance: '@scope+ui@1.0.0_react@19.3.0', name: '@scope/ui' },
    ],
    ['/repo/src/app/main.tsx', undefined],
    ['\0vite/modulepreload-polyfill.js', undefined],
  ])('reads the package of %s', (id, wanted) => {
    expect(packageOf(id)).toStrictEqual(wanted)
  })
})
