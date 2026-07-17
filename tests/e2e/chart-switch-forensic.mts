/**
 * Quick forensic: bar → line/pie/box/heatmap canvas ink after real clicks.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const OUT = '/tmp/chart-switch-forensic'

async function ink(page: import('playwright').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.chart-pane canvas, canvas') as HTMLCanvasElement | null
    if (!canvas) return { hasCanvas: false, nonWhite: 0 }
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, Math.min(canvas.width, 500), Math.min(canvas.height, 300))
    let nonWhite = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 248 || data[i + 1] < 248 || data[i + 2] < 248) nonWhite++
    }
    const need = document.querySelector('.need')?.textContent || ''
    const tb = document.querySelector('.ws-toolbar')?.textContent || ''
    return { hasCanvas: true, nonWhite, w: canvas.width, h: canvas.height, need, tb: tb.slice(0, 120) }
  })
}

async function switchType(page: import('playwright').Page, type: string) {
  await page.getByLabel('视图类型').selectOption(type)
  await page.waitForTimeout(1200)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    localStorage.clear()
    for (const d of (await indexedDB.databases?.()) || []) if (d.name) indexedDB.deleteDatabase(d.name)
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /一键 Demo/ }).click()
  await page.waitForURL(/\/analyses\//)
  await page.waitForTimeout(1200)
  console.log('demo', await ink(page))
  await page.screenshot({ path: `${OUT}/00-demo.png` })

  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  await page.waitForSelector('text=新建视图')
  await page.getByLabel('View Type').selectOption('bar')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await page.waitForTimeout(1200)
  console.log('bar', await ink(page))
  await page.screenshot({ path: `${OUT}/01-bar.png` })

  for (const t of ['line', 'pie', 'box', 'heatmap', 'scatter']) {
    await switchType(page, t)
    const r = await ink(page)
    console.log(t, r)
    await page.screenshot({ path: `${OUT}/${t}.png` })
    if (!r.hasCanvas || r.nonWhite < 15) {
      console.error('FAIL', t)
      process.exitCode = 1
    }
  }

  await page.getByRole('button', { name: /Edit 图表/ }).click()
  await page.waitForSelector('text=图表配置')
  const fitItem = page.locator('.el-drawer .el-form-item').filter({ hasText: '拟合' })
  await fitItem.locator('.el-select').click()
  await page.getByRole('option', { name: 'Linear' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForTimeout(1000)
  console.log('scatter+fit', await ink(page))
  await page.screenshot({ path: `${OUT}/scatter-fit.png` })

  await browser.close()
  console.log('done', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
