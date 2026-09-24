import { ABSOLUTE_POLICY_PATH, readPolicy } from './shared.ts'
import assert from 'node:assert'
import { type BuildEnvironmentOptions, type Plugin } from 'vite'

export const MODULES_FILE = '.vite/modules.json'

// Rule BSOT-01. Vite gets each number of its build block from the policy file.
export const bundleBuild = (): BuildEnvironmentOptions => {
  const { build } = readPolicy(ABSOLUTE_POLICY_PATH)

  assert(build.target.length > 0)
  assert(Number.isInteger(build.inline_max_bytes))

  return {
    assetsInlineLimit: build.inline_max_bytes,
    manifest: true,
    // Rule BLD-05. Each browser of build.target has modulepreload.
    modulePreload: { polyfill: false },
    rolldownOptions: {
      onLog: (level, log, handler) => {
        if (level === 'warn') {
          handler('error', log)
        } else {
          handler(level, log)
        }
      },
    },
    sourcemap: build.sourcemap === 'hidden' ? 'hidden' : true,
    target: build.target,
  }
}

// Rules PKG-03, PKG-04, and SHAKE-04 read the modules of each chunk.
export const bundleModules = (): Plugin => ({
  apply: 'build',
  generateBundle(_options, bundle) {
    const modules: Record<string, Record<string, number>> = {}

    for (const output of Object.values(bundle)) {
      if (output.type === 'chunk') {
        modules[output.fileName] = Object.fromEntries(
          Object.entries(output.modules).map(([id, module]) => [
            id,
            module.renderedLength,
          ]),
        )
      } else {
        assert(output.type === 'asset')
      }
    }

    this.emitFile({
      fileName: MODULES_FILE,
      source: `${JSON.stringify(modules, null, 2)}\n`,
      type: 'asset',
    })
  },
  name: 'bundle-modules',
})
