import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
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
          include: ['src/**/*.{test,spec}.tsx'],
          name: 'client',
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
          name: 'server',
        },
      },
    ],
  },
})
