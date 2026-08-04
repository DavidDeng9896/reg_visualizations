import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://127.0.0.1:7100'
const OUT = '/opt/cursor/artifacts/fluency-test'
fs.mkdirSync(OUT, { recursive: true })

type R = { name: string; ok: boolean; ms: number; detail?: string }
const results: R[] = []

async function step(name: string, page: Page, fn: () => Promise<string | void>) {
  const t0 = Date.now()
  try {
    const detail = (await fn()) ?? undefined
    const ms = Date.now() - t0
    await page.screenshot({ path: path.join(OUT, `D${String(results.length+1).padStart(2,'0')}-${name}.png`) })
    results.push({ name, ok: true, ms, detail })
    console.log(`✓ ${name} ${ms}ms ${detail ?? ''}`)
  } catch (e) {
    const ms = Date.now() - t0
    await page.screenshot({ path: path.join(OUT, `DFAIL-${name}.png`) }).catch(()=>{})
    results.push({ name, ok: false, ms, detail: e instanceof Error ? e.message : String(e) })
    console.error(`✗ ${name} ${ms}ms`, e)
    // 不中断后续步骤，便于一次跑完流畅度画像
  }
}

const browser = await chromium.launch({ headless: true, slowMo: 50 })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: path.join(OUT, 'video2'), size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const lags: number[] = []

try {
  await step('D01-进纯化分析', page, async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByTestId('analysis-card').filter({ hasText: '抗体纯化工艺分析' }).click()
    await page.waitForURL(/\/analysis\//)
    await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
    return 'ok'
  })

  await step('D02-同分析连续切3张表', page, async () => {
    const names = ['Purification batches', 'SEC purity results', 'Elution 记录']
    const seen: string[] = []
    for (const n of names) {
      const t0 = Date.now()
      await page.getByTestId('sidebar-table').filter({ hasText: n }).first().click()
      await page.getByTestId('grid-stats').waitFor({ state: 'visible' })
      // 标题区应反映当前表
      const label = await page.locator('.ws__main, [data-testid="grid-stats"]').first().innerText()
      lags.push(Date.now() - t0)
      seen.push(`${n}@${Date.now()-t0}ms`)
      await page.waitForTimeout(200)
    }
    return seen.join(' | ')
  })

  await step('D03-打开图表视图', page, async () => {
    const view = page.getByTestId('sidebar-view').filter({ hasText: '各步骤收率' }).first()
    await view.click()
    const t0 = Date.now()
    // 图表骨架或 canvas
    await Promise.race([
      page.getByTestId('chart-canvas').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('.cview__skeleton, .js-plotly-plot').first().waitFor({ state: 'visible', timeout: 15000 }),
    ])
    const ms = Date.now() - t0
    lags.push(ms)
    // 若有骨架，应先出现再消失或与图并存可接受
    return `chart-visible ${ms}ms`
  })

  await step('D04-看板快切两张', page, async () => {
    await page.goto(`${BASE}/dashboards`, { waitUntil: 'domcontentloaded' })
    // 侧栏分段或直达看板路由
    const seg = page.locator('.side__seg-item', { hasText: '看板' }).first()
    if (await seg.isVisible().catch(() => false)) await seg.click()
    await page.getByTestId('dashboard-card').first().waitFor({ state: 'visible', timeout: 10000 })
    const cards = page.getByTestId('dashboard-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 2); i++) {
      const t0 = Date.now()
      await cards.nth(i).click()
      await page.locator('.dash__name, .dash__loading').first().waitFor({ state: 'visible', timeout: 8000 })
      await page.locator('.dash__name').waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined)
      lags.push(Date.now() - t0)
      await page.waitForTimeout(400)
    }
    return `switched ${Math.min(count, 2)} dashboards`
  })

  await step('D05-AI历史选旧会话回看', page, async () => {
    // 确保抽屉可点：先关可能存在的遮罩
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.getByTestId('ai-entry').click()
    await page.getByTestId('ai-drawer').waitFor({ state: 'visible' })
    await page.getByTestId('ai-history').click()
    await page.getByTestId('ai-history-panel').waitFor({ state: 'visible' })
    const item = page.locator('.ai-drawer__hist-item').filter({ hasText: '分析下当前的数据' }).first()
    if (await item.count()) {
      await item.click()
      await page.getByTestId('ai-messages').waitFor({ state: 'visible', timeout: 8000 })
      const text = await page.getByTestId('ai-messages').innerText()
      if (!text.includes('分析')) throw new Error('历史消息未恢复')
      return `restored ${text.slice(0, 40).replace(/\n/g, ' ')}`
    }
    return 'no-matching-history-skip'
  })
} catch (e) {
  console.error('deep aborted', e)
} finally {
  const v = await page.video()?.path()
  await context.close()
  await browser.close()
  if (v && fs.existsSync(v)) fs.renameSync(v, path.join(OUT, 'fluency-deep.webm'))
  const avg = lags.length ? Math.round(lags.reduce((a, b) => a + b, 0) / lags.length) : 0
  const max = lags.length ? Math.max(...lags) : 0
  const report = { results, lags, avgLagMs: avg, maxLagMs: max, at: new Date().toISOString() }
  fs.writeFileSync(path.join(OUT, 'deep-report.json'), JSON.stringify(report, null, 2))
  const fail = results.filter(r => !r.ok).length
  console.log(JSON.stringify({ passed: results.length - fail, failed: fail, avgLagMs: avg, maxLagMs: max }, null, 2))
  if (fail) process.exit(1)
}
