import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*.e2e.{ts,js}',
  webServer: { command: 'pnpm build:dist && pnpm preview', port: 4_173 },
})
