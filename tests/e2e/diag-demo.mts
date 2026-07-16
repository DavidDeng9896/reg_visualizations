import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERR', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CERR', m.text())
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    localStorage.clear()
    for (const d of (await indexedDB.databases?.()) || []) {
      if (d.name) indexedDB.deleteDatabase(d.name)
    }
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /一键 Demo/ }).click()
  await page.waitForURL(/\/analyses\//)
  await page.waitForTimeout(2000)
  const info = await page.evaluate(() => ({
    bodySlice: document.body.innerText.slice(0, 600),
    treeText: document.querySelector('.el-tree')?.innerText || 'NO_TREE',
    opsCount: document.querySelectorAll('.ops button').length,
    buttons: [...document.querySelectorAll('button')]
      .map((b) => b.textContent?.trim())
      .filter(Boolean)
      .slice(0, 40),
  }))
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}

main()
