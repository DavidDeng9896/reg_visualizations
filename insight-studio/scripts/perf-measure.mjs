/**
 * 性能测量脚本（生产 preview）。用法：
 *   1. npm run build && npm run preview -- --port 4173
 *   2. node scripts/perf-measure.mjs [baseURL]
 * 输出：冷/热首屏 LCP + eager JS、分析页/流程图就绪、图表首绘、layout 变更延迟。
 */
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:4173'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  window.__lcp = 0
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries()
      if (e.length) window.__lcp = e[e.length - 1].startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    /* ignore */
  }
})
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')

async function nav(url, cold, readySel) {
  if (cold) {
    await cdp.send('Network.clearBrowserCache')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  } else {
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
  }
  let jsBytes = 0
  const jsReqs = new Set()
  const onResp = (p) => {
    if (p.response?.mimeType?.includes('javascript')) jsReqs.add(p.requestId)
  }
  const onLoad = (p) => {
    if (jsReqs.delete(p.requestId)) jsBytes += p.encodedDataLength || 0
  }
  cdp.on('Network.responseReceived', onResp)
  cdp.on('Network.loadingFinished', onLoad)
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'load' })
  let readyMs = null
  if (readySel) {
    try {
      await page.locator(readySel).first().waitFor({ timeout: 30_000 })
      readyMs = Date.now() - t0
    } catch {
      readyMs = -1
    }
  }
  const m = await page.evaluate(() => ({
    lcp: Math.round(window.__lcp),
    dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventStart),
  }))
  cdp.off('Network.responseReceived', onResp)
  cdp.off('Network.loadingFinished', onLoad)
  return { ...m, jsKB: Math.round(jsBytes / 1024), readyMs }
}

console.log('== 首屏 ==')
console.log('COLD /      :', JSON.stringify(await nav(`${base}/`, true)))
console.log('WARM /      :', JSON.stringify(await nav(`${base}/`, false)))

// 种 demo 数据（生产构建走 Dexie）
await page.getByRole('button', { name: '一键 Demo' }).click()
await page.waitForURL(/\/analysis\//)
const aUrl = page.url()

console.log('== 工作区 / 流程图 ==')
console.log('COLD analysis :', JSON.stringify(await nav(aUrl, true, '[data-testid=sidebar-table]')))
await nav(aUrl, false, '[data-testid=sidebar-table]')
const tFlow = Date.now()
await page.getByRole('button', { name: 'Flowchart' }).click()
await page.locator('.vue-flow__node').first().waitFor({ timeout: 30_000 })
console.log('flowchart 切換首绘    :', Date.now() - tFlow, 'ms')

console.log('== 图表 ==')
await page.getByRole('button', { name: 'Workspace' }).click()
await page.locator('[data-testid=sidebar-table]', { hasText: 'Iris' }).first().click()
await page.getByRole('button', { name: '创建图表' }).click()
await page.getByRole('combobox', { name: 'X Axis' }).click()
await page.getByRole('listbox').last().getByRole('option', { name: 'sepal_length', exact: true }).click()
await page.getByRole('combobox', { name: 'Y Axis' }).click()
await page.getByRole('listbox').last().getByRole('option', { name: 'sepal_width', exact: true }).click()
const tChart = Date.now()
await page.getByRole('button', { name: 'Save' }).click()
await page.locator('.js-plotly-plot').first().waitFor({ timeout: 60_000 })
console.log('chart 首绘（含 Plotly chunk）:', Date.now() - tChart, 'ms')

await browser.close()
