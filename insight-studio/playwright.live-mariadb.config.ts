import { defineConfig } from '@playwright/test'

/**
 * 对已运行的开发栈做全功能点击（Vite :7100 + Go :8787 + MariaDB）。
 * 不启动 webServer，避免默认 e2e 拉起 Node sqlite。
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/scientist-skills-e2e.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:7100',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
})
