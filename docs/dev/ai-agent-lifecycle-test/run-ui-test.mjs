#!/usr/bin/env node
/**
 * Headed Playwright driver: real UI conversation against :7100 (no mock).
 * Never clicks ai-stop. Handles ask_user / confirm / continue.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/workspace/insight-studio/package.json')
const { chromium } = require('playwright')

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SHOT = path.join(ROOT, 'screenshots')
const LOG = path.join(ROOT, 'ui-test-log.jsonl')
fs.mkdirSync(SHOT, { recursive: true })

const R1 = fs.readFileSync(path.join(ROOT, 'r1-prompt.md'), 'utf8').trim()
const R2 = fs.readFileSync(path.join(ROOT, 'r2-prompt.md'), 'utf8').trim()
const MD = path.join(ROOT, 'hai-club-data-lifecycle.md')

function log(event, extra = {}) {
  const row = { ts: new Date().toISOString(), event, ...extra }
  fs.appendFileSync(LOG, JSON.stringify(row) + '\n')
  console.log(row.ts, event, extra.note ?? extra.error ?? '')
}

async function shot(page, name) {
  const file = path.join(SHOT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  log('screenshot', { note: file })
}

async function openAi(page) {
  const drawer = page.getByTestId('ai-drawer')
  if (await drawer.isVisible().catch(() => false)) return
  await page.getByTestId('ai-fab').click()
  await drawer.waitFor({ state: 'visible', timeout: 20_000 })
}

async function setAllowAll(page) {
  await page.getByTestId('ai-permission').click()
  const allow = page.getByTestId('ai-permission-allow')
  await allow.waitFor({ state: 'visible', timeout: 8_000 })
  await allow.click()
  log('permission', { note: 'allow' })
}

async function idle(page) {
  const stop = await page.getByTestId('ai-stop').count()
  const send = await page.getByTestId('ai-send').count()
  return stop === 0 && send > 0
}

async function handlePrompts(page) {
  // write confirms
  const confirms = page.getByTestId('ai-trace-confirm')
  const n = await confirms.count()
  if (n) {
    await confirms.first().click()
    log('confirm', { note: `clicked ${n} visible` })
    await page.waitForTimeout(500)
    return true
  }
  const ask = page.getByTestId('ai-ask')
  if (await ask.count()) {
    const other = page.getByTestId('ai-ask-other')
    if (await other.count()) {
      await other.fill('按已给口径：项目 hlx69，达标 10 倍，双价，WT Kd=10nM。请继续用工具造表。')
    }
    const opt = ask.locator('button').filter({ hasNotText: /取消|提交/ }).first()
    if (await opt.count()) await opt.click().catch(() => {})
    await page.getByTestId('ai-ask-submit').click()
    log('ask_user', { note: 'submitted default SOP answer' })
    await page.waitForTimeout(500)
    return true
  }
  return false
}

async function waitRound(page, label, maxMs) {
  const start = Date.now()
  let lastShot = 0
  let continues = 0
  while (Date.now() - start < maxMs) {
    await handlePrompts(page)
    const running = !(await idle(page))
    if (Date.now() - lastShot > 45_000) {
      lastShot = Date.now()
      await shot(page, `${label}-t${Math.round((Date.now() - start) / 1000)}s`)
      const text = (await page.getByTestId('ai-drawer').innerText().catch(() => '')).slice(0, 2500)
      log('heartbeat', { note: label, running, elapsed_s: Math.round((Date.now() - start) / 1000), preview: text })
    }
    if (!running) {
      const cont = page.getByTestId('ai-continue')
      if ((await cont.count()) && continues < 3) {
        continues += 1
        log('continue', { note: `${label} click #${continues}` })
        await cont.click()
        await page.waitForTimeout(25_000)
        continue
      }
      await page.waitForTimeout(4000)
      if (await idle(page)) {
        log('round_idle', { note: label, elapsed_s: Math.round((Date.now() - start) / 1000) })
        return
      }
    }
    await page.waitForTimeout(1500)
  }
  throw new Error(`${label} timed out after ${maxMs}ms`)
}

async function send(page, text) {
  const box = page.getByTestId('ai-input')
  await box.click()
  await box.fill(text)
  const val = await box.inputValue()
  if (val.length < text.length * 0.9) {
    throw new Error(`prompt truncated: got ${val.length} expected ${text.length}`)
  }
  log('prompt_len', { note: `filled ${val.length} chars` })
  await page.getByTestId('ai-send').click()
  await page.getByTestId('ai-stop').waitFor({ state: 'visible', timeout: 30_000 })
}

async function tableStats(page) {
  const tables = page.getByTestId('sidebar-table')
  const n = await tables.count()
  const names = []
  for (let i = 0; i < n; i++) names.push((await tables.nth(i).innerText()).trim())
  const stats = (await page.getByTestId('grid-stats').innerText().catch(() => '')).trim()
  log('tables', { names, stats })
  return { names, stats }
}

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(20_000)

try {
  log('goto')
  await page.goto('http://127.0.0.1:7100/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(3000)
  await shot(page, '00-home')

  await openAi(page)
  await page.getByTestId('ai-newconv').click()
  await page.waitForTimeout(500)
  await setAllowAll(page)
  await shot(page, '01-drawer')

  await page.getByTestId('ai-file-input').setInputFiles(MD)
  await page.getByTestId('ai-pending-att').first().waitFor({ timeout: 20_000 })
  log('attached')
  await shot(page, '02-attached')

  log('send_r1')
  await send(page, R1)
  await waitRound(page, 'r1', 50 * 60 * 1000)
  await shot(page, 'r1-done')
  const r1tables = await tableStats(page)
  const r1text = await page.getByTestId('ai-drawer').innerText()
  fs.writeFileSync(path.join(ROOT, 'r1-drawer.txt'), r1text)
  log('r1_done', { tables: r1tables.names, stats: r1tables.stats })

  log('send_r2')
  await send(page, R2)
  await waitRound(page, 'r2', 40 * 60 * 1000)
  await shot(page, 'r2-done')
  const r2tables = await tableStats(page)
  const r2text = await page.getByTestId('ai-drawer').innerText()
  fs.writeFileSync(path.join(ROOT, 'r2-drawer.txt'), r2text)
  log('r2_done', { tables: r2tables.names, stats: r2tables.stats })

  const trace = page.getByTestId('ai-trace-head')
  if (await trace.count()) {
    await trace.last().click().catch(() => {})
    await shot(page, 'trace-expanded')
  }
  log('complete')
} catch (e) {
  log('fatal', { error: String(e?.stack || e) })
  await shot(page, 'fatal').catch(() => {})
  process.exitCode = 1
} finally {
  await page.context().storageState({ path: path.join(ROOT, 'playwright-state.json') }).catch(() => {})
  // keep browser open 10s for recording, then close
  await page.waitForTimeout(4000)
  await browser.close()
}
