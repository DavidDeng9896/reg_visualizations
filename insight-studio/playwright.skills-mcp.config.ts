import { defineConfig } from '@playwright/test'

/**
 * 对已运行的开发栈冒烟 Skills/MCP（Vite :7100 + Go :8787）。
 * 不启动 webServer，避免默认 e2e 拉起无 Skills 的 Node API。
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/skills-mcp-panel.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:7100',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
})
