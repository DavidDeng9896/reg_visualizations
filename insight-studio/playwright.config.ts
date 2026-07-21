import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:7100',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:7100',
    reuseExistingServer: false,
    timeout: 90_000,
  },
})
