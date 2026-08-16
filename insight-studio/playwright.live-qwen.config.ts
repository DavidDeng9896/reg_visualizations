import { defineConfig } from '@playwright/test'

/** 对已运行开发栈做真实 Qwen 对话验收（不启动 webServer）。 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/ai-live-qwen.spec.ts',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:7100',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
