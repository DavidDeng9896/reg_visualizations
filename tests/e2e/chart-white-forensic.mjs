import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const OUT = '/tmp/chart-white'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  localStorage.clear()
  sessionStorage.clear()
  for (const d of (await indexedDB.databases?.()) || []) if (d.name) indexedDB.deleteDatabase(d.name)
})
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '一键 Demo（含示例数据）' }).click()
await page.waitForURL(/\/analyses\//)
await page.waitForTimeout(3000)

const info = await page.evaluate(() => {
  function rect(el) {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }
  }
  function css(el, props) {
    if (!el) return null
    const s = getComputedStyle(el)
    const out = {}
    for (const p of props) out[p] = s[p]
    return out
  }
  const pane = document.querySelector('.chart-pane')
  const table = document.querySelector('.table-pane')
  const body = document.querySelector('.ws-body')
  const canvas = document.querySelector('.chart .canvas')
  const canvasEl = document.querySelector('.chart canvas')
  return {
    body: rect(body),
    table: rect(table),
    pane: rect(pane),
    canvas: rect(canvas),
    canvasBitmap: canvasEl ? { w: canvasEl.width, h: canvasEl.height } : null,
    bodyCss: css(body, ['display', 'flexDirection', 'height', 'minHeight']),
    tableCss: css(table, ['flexGrow', 'flexShrink', 'flexBasis', 'minHeight', 'height', 'overflow']),
    paneCss: css(pane, ['flexGrow', 'flexShrink', 'flexBasis', 'minHeight', 'height', 'overflow']),
    tableStyle: table?.getAttribute('style'),
    paneStyle: pane?.getAttribute('style'),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: `${OUT}/full2.png` })
await page.locator('.chart-pane').screenshot({ path: `${OUT}/pane2.png` })
await browser.close()
