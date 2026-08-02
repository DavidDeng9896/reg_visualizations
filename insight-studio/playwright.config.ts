import { defineConfig } from '@playwright/test'

/**
 * E2E 使用独立测试环境，避免污染开发库：
 * - insight-api 独立实例（127.0.0.1:8788），SQLite 落 insight-api/data/insight-e2e.sqlite
 * - vite 独立端口 7101，/api 代理指向 8788（INSIGHT_API_ORIGIN）
 * 日常开发（7100 + 8787 的 insight.sqlite）不受测试影响。
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:7101',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
  webServer: [
    {
      command: 'npm --prefix ../insight-api run dev',
      url: 'http://127.0.0.1:8788/health',
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        PORT: '8788',
        INSIGHT_DB_PATH: 'data/insight-e2e.sqlite',
      },
    },
    {
      command: 'npm run dev:web -- --port 7101 --strictPort',
      url: 'http://localhost:7101',
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        INSIGHT_API_ORIGIN: 'http://127.0.0.1:8788',
      },
    },
  ],
})
