import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:7100'
const OUT = '/tmp/overlay-teleport'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.log('PAGEERR', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  localStorage.clear()
  sessionStorage.clear()
  for (const d of (await indexedDB.databases?.()) || []) if (d.name) indexedDB.deleteDatabase(d.name)
})
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '一键 Demo' }).first().click()
await page.waitForURL(/\/analysis\//)
await page.waitForTimeout(1500)

// Select a table from sidebar
await page.getByText('Plate 96 dose-response').first().click()
await page.waitForTimeout(1500)
// Prefer a chart/table view if listed
const view = page.getByText(/scatter|dose|view|视图/i).first()
if (await view.count()) {
  try { await view.click({ timeout: 1000 }) } catch {}
  await page.waitForTimeout(800)
}
await page.screenshot({ path: `${OUT}/01-workspace.png` })

const filterBtn = page.getByRole('button', { name: /筛选 / }).first()
await filterBtn.waitFor({ timeout: 15000 })
await filterBtn.click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/02-filter-open.png` })

const info = await page.evaluate(() => {
  const floating = [...document.querySelectorAll('[data-is-floating="1"]')]
  return {
    floatingCount: floating.length,
    panels: floating.map((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        cls: String(el.className).slice(0, 60),
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        pos: cs.position,
        parent: el.parentElement?.tagName,
      }
    }),
  }
})
console.log(JSON.stringify(info, null, 2))

const pop = info.panels.find((p) => String(p.cls).includes('popover'))
if (!pop || pop.parent !== 'BODY' || pop.h < 60 || pop.pos !== 'fixed') {
  console.error('FAIL filter popover', pop)
  process.exitCode = 1
} else {
  console.log('PASS filter popover teleported, h=', pop.h)
}

const sel = page.locator('[data-is-floating="1"] .is-select__trigger').first()
if (await sel.count()) {
  await sel.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/03-select-in-filter.png` })
  const selPanels = await page.evaluate(() =>
    [...document.querySelectorAll('.is-select__panel[data-is-floating="1"]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { h: Math.round(r.height), parent: el.parentElement?.tagName, pos: getComputedStyle(el).position }
    }),
  )
  console.log('selectPanels', selPanels)
  if (!selPanels.some((s) => s.parent === 'BODY' && s.h > 40 && s.pos === 'fixed')) {
    console.error('FAIL nested select')
    process.exitCode = 1
  } else console.log('PASS nested select')
}

await page.keyboard.press('Escape')
await page.waitForTimeout(150)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
const menuBtn = page.getByRole('button', { name: /列菜单/ }).first()
await menuBtn.click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/04-col-menu.png` })
const menu = await page.evaluate(() => {
  const el = document.querySelector('.is-popover__panel[data-is-floating="1"]')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { h: Math.round(r.height), parent: el.parentElement?.tagName, text: el.textContent?.slice(0, 100) }
})
console.log('colMenu', menu)
if (!menu || menu.parent !== 'BODY' || menu.h < 80) {
  console.error('FAIL col menu')
  process.exitCode = 1
} else console.log('PASS col menu')

await browser.close()
console.log('done', OUT)
