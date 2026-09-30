import { bundleBuild, bundleModules } from './scripts/bundle/viteBuild.ts'
import { secretNameOf } from './src/shared/parse/environment.ts'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Vite puts each VITE_ variable into the bundle, so a secret name stops the build.
const refuseShippedSecret = (): Plugin => ({
  config: (_config, { mode }) => {
    const secretName = secretNameOf(
      Object.keys(loadEnv(mode, process.cwd(), 'VITE_')),
    )

    if (secretName !== undefined) {
      throw new Error(
        `the variable ${secretName} is a secret, and Vite ships each VITE_ variable to the browser`,
      )
    }
  },
  name: 'refuse-shipped-secret',
})

export default defineConfig({
  build: bundleBuild(),
  plugins: [react(), bundleModules(), refuseShippedSecret()],
  test: {
    expect: { requireAssertions: true },
    passWithNoTests: true,
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          browser: {
            enabled: true,
            instances: [{ browser: 'chromium', headless: true }],
            provider: playwright(),
          },
          expect: { poll: { timeout: 1_000 } },
          include: ['src/**/*.{test,spec}.tsx'],
          name: 'client',
          setupFiles: ['./vitest.setup.browser.ts'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
          name: 'server',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          environment: 'node',
          include: ['src/shared/infrastructure/**/*.integration.ts'],
          name: 'integration',
        },
      },
    ],
  },
})
