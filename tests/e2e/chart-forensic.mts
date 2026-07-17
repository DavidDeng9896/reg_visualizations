/**
 * Chart usability forensic: open Demo, inspect chart DOM/canvas/errors.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')))
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`)
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    localStorage.clear()
    for (const d of (await indexedDB.databases?.()) || []) if (d.name) indexedDB.deleteDatabase(d.name)
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /一键 Demo/ }).click()
  await page.waitForURL(/\/analyses\//)
  await page.waitForTimeout(2500)

  // Screenshot workspace
  await page.screenshot({ path: '/tmp/chart-forensic-1.png', fullPage: true })

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const chartRoot = document.querySelector('.chart, .canvas, [_echarts_instance_]')
    const echartsDom = document.querySelector('[_echarts_instance_]') || document.querySelector('.canvas')
    return {
      hasCanvas: !!canvas,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height, cw: canvas.clientWidth, ch: canvas.clientHeight } : null,
      chartHtml: document.querySelector('.chart')?.innerHTML?.slice(0, 500) || 'NO .chart',
      bodyButtons: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean),
      selectedViewText: document.querySelector('.ws-toolbar')?.textContent || '',
      hasEdit: !!document.body.innerText.includes('Edit 图表'),
      echartsInstanceAttr: !!document.querySelector('[_echarts_instance_]'),
      chartPaneBox: (() => {
        const el = document.querySelector('.chart-pane, .chart')
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { w: r.width, h: r.height, display: getComputedStyle(el).display }
      })(),
    }
  })

  // Open Edit chart and try set fields if empty
  if (await page.getByRole('button', { name: /Edit 图表/ }).count()) {
    await page.getByRole('button', { name: /Edit 图表/ }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/chart-forensic-edit.png', fullPage: true })
    const drawerText = await page.locator('.drawer-root, .el-drawer, .el-overlay').innerText().catch(() => '')
    fs.writeFileSync('/tmp/chart-forensic-drawer.txt', drawerText)
    await page.getByRole('button', { name: 'Save', exact: true }).click().catch(() => {})
    await page.waitForTimeout(1000)
  }

  await page.screenshot({ path: '/tmp/chart-forensic-2.png', fullPage: true })

  const report = { info, errors, screenshots: ['/tmp/chart-forensic-1.png', '/tmp/chart-forensic-edit.png', '/tmp/chart-forensic-2.png'] }
  fs.writeFileSync('/tmp/chart-forensic.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
