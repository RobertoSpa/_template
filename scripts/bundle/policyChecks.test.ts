import {
  extensionProblems,
  gateProblems,
  integerProblems,
  manifestProblems,
  routeRecordProblems,
  viteProblems,
  workflowProblems,
} from './policyChecks.ts'
import { type Policy } from './shared.ts'
import { describe, expect, it } from 'vitest'

const policyWith = (changes: Partial<Policy> = {}): Policy => ({
  build: {
    env: { LC_ALL: 'C', TZ: 'UTC' },
    inline_max_bytes: 1_024,
    sourcemap: 'hidden',
    target: 'es2023',
  },
  ceiling: { css: 1_000, js: 1_000, loaded: 3_000, total: 3_000 },
  deviation: { file: 'bundle/deviations.yaml', max_days: 30 },
  files: {
    script: {
      compress: true,
      extensions: ['.js'],
      max_raw: 200,
      max_wire: 100,
    },
  },
  gates: ['policy', 'size'],
  growth: { branch_max_bytes: 100, review_percent: 20 },
  measure: {
    brotli_quality: 11,
    sizes_file: 'bundle/sizes.json',
    skip_dir: '.vite',
    skip_extensions: ['.map'],
  },
  packages: { denied: ['core-js'] },
  routes: [
    {
      budget: { css: 400, js: 400, loaded: 1_200, total: 1_200 },
      owner: 'RobertoSpa',
      path: '/',
      stage: 'estimate',
    },
  ],
  shake: { side_effects: ['*.css'], test_patterns: ['.test.'] },
  stage: {
    lock_from: 'measured',
    margin: { analysis: 30, estimate: 50, measured: 20, released: 5 },
    order: ['estimate', 'analysis', 'measured', 'released'],
    slack_bytes: 100,
  },
  version: 1,
  ...changes,
})

const MANIFEST = {
  dependencies: { react: '19.3.0' },
  devDependencies: { vite: '8.3.0' },
  sideEffects: ['*.css'],
}

describe('integerProblems', () => {
  it('passes whole numbers of bytes', () => {
    expect(integerProblems(policyWith())).toStrictEqual([])
  })

  it('refuses a fraction of a byte', () => {
    expect(
      integerProblems(
        policyWith({
          ceiling: { css: 1_000, js: 1_000.5, loaded: 3_000, total: 3_000 },
        }),
      ),
    ).toStrictEqual([
      'ceiling.js is 1000.5, and not an integer of bytes. Rule BYTE-03.',
    ])
  })
})

describe('extensionProblems', () => {
  it('refuses one extension in two groups', () => {
    expect(
      extensionProblems({
        other: { compress: true, extensions: ['.js'], max_raw: 1, max_wire: 1 },
        script: {
          compress: true,
          extensions: ['.js'],
          max_raw: 1,
          max_wire: 1,
        },
      }),
    ).toStrictEqual([
      'the extension .js is in two groups of files. Rule BYTE-02.',
    ])
  })
})

describe('manifestProblems', () => {
  it('passes a manifest with no denied package and the side effects list', () => {
    expect(manifestProblems(MANIFEST, policyWith())).toStrictEqual([])
  })

  it.each([
    [
      { ...MANIFEST, devDependencies: { 'core-js': '3.0.0', vite: '8.3.0' } },
      ['core-js is in packages.denied. Rule PKG-02.'],
    ],
    [
      { ...MANIFEST, sideEffects: false },
      [
        'sideEffects of package.json is false, and shake.side_effects is ["*.css"]. Rule SHAKE-01.',
      ],
    ],
  ])('refuses %j', (manifest, wanted) => {
    expect(manifestProblems(manifest, policyWith())).toStrictEqual(wanted)
  })
})

describe('routeRecordProblems', () => {
  it('passes a complete record inside the margin of its stage', () => {
    expect(routeRecordProblems(policyWith(), [], [])).toStrictEqual([])
  })

  it('refuses a page and a resilience route with no record', () => {
    expect(
      routeRecordProblems(policyWith(), ['home'], ['/settings']),
    ).toStrictEqual([
      'src/pages/home has no record in routes. Rule STG-01.',
      '/settings of resilience/routes.yaml has no record in routes. Rule STG-01.',
    ])
  })

  it('refuses a budget one byte over the margin of its stage', () => {
    expect(
      routeRecordProblems(
        policyWith({
          routes: [
            {
              budget: { css: 400, js: 501, loaded: 1_200, total: 1_200 },
              owner: 'a',
              path: '/',
              stage: 'estimate',
            },
          ],
        }),
        [],
        [],
      ),
    ).toStrictEqual([
      '/ has a js budget of 501. The stage estimate permits 500. Rule STG-04.',
    ])
  })

  it('refuses a record with no owner and an unknown stage', () => {
    expect(
      routeRecordProblems(
        policyWith({
          routes: [
            {
              budget: { css: 1, js: 1, loaded: 1, total: 1 },
              owner: '',
              path: '/',
              stage: 'done',
            },
          ],
        }),
        [],
        [],
      ),
    ).toStrictEqual([
      '/ has no owner. Rule STG-02.',
      '/ has the stage done, which is not in stage.order. Rule STG-02.',
    ])
  })
})

describe('viteProblems', () => {
  const resolved = {
    assetsInlineLimit: '1024',
    manifest: 'true',
    modulePreloadPolyfill: 'false',
    onLog: 'true',
    sourcemap: 'hidden',
    target: 'es2023',
  }

  it('refuses the modulepreload polyfill', () => {
    expect(
      viteProblems(
        { ...resolved, modulePreloadPolyfill: 'true' },
        policyWith(),
      ),
    ).toStrictEqual([
      'vite.config.ts gives build.modulePreloadPolyfill true, and the policy gives false. Rule BLD-05.',
    ])
  })

  it('passes a configuration that agrees with the policy', () => {
    expect(viteProblems(resolved, policyWith())).toStrictEqual([])
  })

  it('refuses each value that disagrees', () => {
    expect(
      viteProblems(
        {
          ...resolved,
          assetsInlineLimit: '4096',
          manifest: 'false',
          onLog: 'false',
        },
        policyWith(),
      ),
    ).toStrictEqual([
      'vite.config.ts gives build.assetsInlineLimit 4096, and the policy gives 1024. Rule BSOT-01.',
      'vite.config.ts gives build.manifest false, and the policy gives true. Rule BSOT-01.',
      'vite.config.ts gives build.onLog false, and the policy gives true. Rule BSOT-01.',
    ])
  })
})

describe('gateProblems', () => {
  it('passes a gate list with policy and size', () => {
    expect(gateProblems(['policy', 'size'])).toStrictEqual([])
  })

  it('refuses a gate list with no size gate, and a name that is not a gate', () => {
    expect(gateProblems(['policy', 'write'])).toStrictEqual([
      'gates has no size. Rule BSOT-02.',
      'gates holds write, which is not a gate. Rule BSOT-02.',
    ])
  })
})

describe('workflowProblems', () => {
  it('passes one bundle step', () => {
    expect(workflowProblems('      - run: pnpm bundle\n')).toStrictEqual([])
  })

  it('refuses a second bundle step and continue-on-error', () => {
    expect(
      workflowProblems(
        '      - run: pnpm bundle\n        continue-on-error: true\n      - run: pnpm bundle:size\n',
      ),
    ).toStrictEqual([
      'the bundle workflow has 2 bundle steps, and it must have 1. Rule BSOT-02.',
      'the bundle workflow holds continue-on-error. Rule FAIL-02.',
    ])
  })

  it('refuses one step that runs a single gate', () => {
    expect(workflowProblems('      - run: pnpm bundle:size\n')).toStrictEqual([
      'the bundle step of the workflow is not exactly `pnpm bundle`. Rule BSOT-02.',
    ])
  })
})
