/**
 * Probe: new bar/pie/heatmap views without auto-mapping; switch types; measure chart emptiness.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    localStorage.clear()
    for (const d of (await indexedDB.databases?.()) || []) if (d.name) indexedDB.deleteDatabase(d.name)
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /一键 Demo/ }).click()
  await page.waitForURL(/\/analyses\//)
  await page.waitForTimeout(1000)

  // Create bar view via sidebar
  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  await page.getByLabel('View Type').selectOption('bar')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/chart-bar-new.png', fullPage: true })

  const barInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    // sample some pixels to see if chart is blank white
    let nonWhite = 0
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const { data } = ctx.getImageData(0, 0, Math.min(canvas.width, 200), Math.min(canvas.height, 100))
        for (let i = 0; i < data.length; i += 16) {
          if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) nonWhite++
        }
      }
    }
    return {
      toolbar: document.querySelector('.ws-toolbar')?.textContent,
      canvas: canvas ? { w: canvas.width, h: canvas.height } : null,
      nonWhiteSamples: nonWhite,
      hasEmptyHint: document.body.innerText.includes('请配置') || document.body.innerText.includes('Required'),
      modelTablesVisible: document.body.innerText.includes('MODEL VARIABLES'),
    }
  })

  // Switch view type to pie via toolbar
  await page.getByLabel('视图类型').selectOption('pie')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/tmp/chart-pie-switch.png', fullPage: true })

  // Switch to heatmap
  await page.getByLabel('视图类型').selectOption('heatmap')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/tmp/chart-heatmap.png', fullPage: true })

  // Open edit and check if fields empty
  await page.getByRole('button', { name: /Edit 图表/ }).click()
  await page.waitForTimeout(500)
  const drawer = await page.locator('.el-drawer').innerText()
  await page.screenshot({ path: '/tmp/chart-heatmap-edit.png', fullPage: true })

  const out = { barInfo, drawer: drawer.slice(0, 800), errors }
  fs.writeFileSync('/tmp/chart-probe.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
  await browser.close()
}

main()
