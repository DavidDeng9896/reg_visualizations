import { chromium, type FullConfig } from '@playwright/test'

/**
 * 预热 vite dev 的按需编译缓存：访问列表页与工作区路由（懒加载 chunk），
 * 避免首个用例撞上 WorkspacePage（echarts/vxe/vue-flow）冷编译超时。
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:7100'
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle', timeout: 60_000 })
    // 触发 WorkspacePage 懒加载 chunk 编译（id 不存在会被 replace 回列表，无所谓）
    await page.goto(`${baseURL}/analysis/warmup`, { waitUntil: 'load', timeout: 120_000 })
    await page.waitForTimeout(3000)
    await page.goto(`${baseURL}/`, { waitUntil: 'load', timeout: 30_000 })
  } finally {
    await browser.close()
  }
}
