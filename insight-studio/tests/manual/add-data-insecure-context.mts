/**
 * 真实浏览器：模拟非安全上下文（无 crypto.randomUUID），验证侧栏「+」四项功能可打开且不抛错。
 * 用法：npx tsx tests/manual/add-data-insecure-context.mts
 */
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:7100'

async function closeOverlays(page: Page) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(120)
  }
}

async function openAddItem(page: Page, label: RegExp) {
  await closeOverlays(page)
  const add = page.locator('button.side__add[aria-label="Add data"]')
  await add.click()
  const item = page.getByRole('menuitem', { name: label })
  await item.waitFor({ state: 'visible', timeout: 8000 })
  await item.click()
}

async function main() {
  const browser = await chromium.launch({ headless: true, slowMo: 20 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  // 在任何脚本跑之前抹掉 randomUUID，模拟 http://bore.pub 非安全上下文
  await page.addInitScript(() => {
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: undefined,
        configurable: true,
      })
    } catch {
      /* ignore */
    }
    ;(globalThis as { __IS_SECURE_PROBE?: boolean }).__IS_SECURE_PROBE = true
  })

  console.log(`Add-data insecure-context → ${BASE}`)
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(800)

  const probe = await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasRandomUUID: typeof crypto?.randomUUID,
  }))
  console.log('probe', probe)
  if (typeof (await page.evaluate(() => typeof crypto?.randomUUID)) === 'function') {
    // 某些环境 defineProperty 无效：再硬删
    await page.evaluate(() => {
      try {
        // @ts-expect-error force
        delete crypto.randomUUID
      } catch {
        /* */
      }
    })
  }

  await page.getByTestId('analysis-card').first().click()
  await page.waitForURL(/\/analysis\//, { timeout: 20000 })
  await page.waitForTimeout(2000)

  const cases: { id: string; label: RegExp; dialog: RegExp | string }[] = [
    { id: 'csv', label: /Import CSV/, dialog: 'Import CSV' },
    { id: 'excel', label: /Import Excel/, dialog: 'Import Excel' },
    { id: 'sql', label: /Import from SQL/, dialog: 'Import from SQL' },
    { id: 'combine', label: /Combine tables/, dialog: /Combine tables/ },
  ]

  for (const c of cases) {
    const before = errors.length
    await openAddItem(page, c.label)
    const dlg = page.getByRole('dialog', { name: c.dialog })
    await dlg.waitFor({ state: 'visible', timeout: 10000 })
    const overlay = await page.locator('.is-modal__overlay').count()
    const newErrs = errors.slice(before)
    const uuidErrs = newErrs.filter((e) => /randomUUID/i.test(e))
    if (uuidErrs.length) throw new Error(`${c.id} still throws randomUUID: ${uuidErrs.join(' | ')}`)
    if (overlay < 1) throw new Error(`${c.id} opened without modal overlay (got popover?)`)
    console.log(`✓ ${c.id} dialog open, overlay=${overlay}, newErrors=${newErrs.length}`)
    await closeOverlays(page)
  }

  // CSV 完整导入在无 randomUUID 下也应成功
  await openAddItem(page, /Import CSV/)
  const csvDlg = page.getByRole('dialog', { name: 'Import CSV' })
  await csvDlg.locator('input[type="file"]').setInputFiles({
    name: 'insecure.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('k,v\na,1\nb,2\n'),
  })
  await page.waitForTimeout(600)
  await csvDlg.getByRole('button', { name: /Add table/i }).click()
  await page.waitForTimeout(1200)
  const tree = await page.locator('.tree').innerText()
  if (!/insecure/i.test(tree)) throw new Error(`CSV import failed without randomUUID; tree=${tree.slice(0, 200)}`)
  console.log('✓ csv import committed under no-randomUUID')

  const fatal = errors.filter((e) => /randomUUID|emitsOptions|reading 'component'/i.test(e))
  if (fatal.length) {
    console.error('fatal errors', fatal)
    throw new Error(`fatal page errors remain: ${fatal.join(' | ')}`)
  }

  console.log(`PASS  errors=${errors.length} (non-fatal ok)`)
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
