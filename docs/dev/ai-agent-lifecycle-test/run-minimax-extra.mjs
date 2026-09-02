#!/usr/bin/env node
/** MiniMax 补充实跑：工程师 / 提问卡 / 附件 / 中止续跑 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/workspace/insight-studio/package.json')
const { chromium } = require('playwright')

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'minimax-extra.json')
const SHOT = path.join(ROOT, 'screenshots')
fs.mkdirSync(SHOT, { recursive: true })
const ORIGIN = process.env.INSIGHT_ORIGIN || 'http://127.0.0.1:7100'
const results = []

function record(id, status, note, extra = {}) {
  const row = { ts: new Date().toISOString(), id, status, note, ...extra }
  results.push(row)
  console.log(`[${status}] ${id}: ${note}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function openAi(page) {
  if (await page.getByTestId('ai-drawer').isVisible().catch(() => false)) return
  await page.getByTestId('ai-fab').click()
  await page.getByTestId('ai-drawer').waitFor({ state: 'visible', timeout: 20_000 })
}

async function setAllowAll(page) {
  await page.getByTestId('ai-permission').click()
  await page.getByTestId('ai-permission-allow').click()
}

async function idle(page) {
  return (await page.getByTestId('ai-stop').count()) === 0
}

async function handlePrompts(page) {
  const confirms = page.getByTestId('ai-trace-confirm')
  if (await confirms.count()) {
    await confirms.first().click()
    return true
  }
  const ask = page.getByTestId('ai-ask')
  if (await ask.count()) {
    const opt = ask.locator('.ask__opt').first()
    if (await opt.count()) await opt.click().catch(() => {})
    const submit = page.getByTestId('ai-ask-submit')
    if (await submit.isEnabled().catch(() => false)) await submit.click()
    return true
  }
  return false
}

async function waitIdle(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await handlePrompts(page)
    if (await idle(page)) {
      await page.waitForTimeout(2000)
      if (await idle(page)) return Date.now() - start
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`idle timeout ${maxMs}ms`)
}

async function drawerText(page) {
  return (await page.getByTestId('ai-drawer').innerText().catch(() => '')).slice(0, 5000)
}

async function newConv(page) {
  await openAi(page)
  await page.getByTestId('ai-newconv').click()
  await page.waitForTimeout(400)
  await setAllowAll(page)
}

async function send(page, prompt) {
  await page.getByTestId('ai-input').fill(prompt)
  await page.getByTestId('ai-send').click()
  await page.getByTestId('ai-stop').waitFor({ state: 'visible', timeout: 30_000 })
}

const SCENES = [
  {
    id: 'code-worker',
    prompt:
      '用 import_csv_text 导入表 nums：\nn,v\n1,10\n2,20\n然后派「工程师」子代理（delegate_code_worker）添加 Custom Code：输出表 doubled，把 v 乘 2。不要出图。',
    expect: [/工程师|Custom Code|doubled|翻倍/i],
    timeoutMs: 300_000,
  },
  {
    id: 'ask-user',
    prompt:
      '必须调用 ask_user 问我：柱状图还是折线图？选项只要 bar 和 line 两个。在我回答之前不要建图。',
    expect: [/柱状图|折线图|bar|line/i],
    timeoutMs: 120_000,
    stopAtAsk: true,
  },
  {
    id: 'attachment-csv',
    prompt: '把我刚上传的附件导入为表 att_demo，然后 list_tables 确认表名。',
    attach: 'id,name\n1,Alice\n2,Bob\n',
    expect: [/att_demo|Alice/i],
    timeoutMs: 180_000,
  },
]

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: '新建分析' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').first().fill('minimax-extra')
  await dialog.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/analysis\//)

  for (const spec of SCENES) {
    await newConv(page)
    if (spec.attach) {
      const input = page.locator('input[type="file"]').first()
      const filePath = path.join(ROOT, `_tmp_${spec.id}.csv`)
      fs.writeFileSync(filePath, spec.attach)
      await input.setInputFiles(filePath)
      await page.waitForTimeout(800)
    }
    await send(page, spec.prompt)
    try {
      if (spec.stopAtAsk) {
        await page.getByTestId('ai-ask').waitFor({ state: 'visible', timeout: spec.timeoutMs })
        const text = await drawerText(page)
        const hasAsk = /ask|提问|柱状图|折线图/i.test(text)
        await page.screenshot({ path: path.join(SHOT, `extra-${spec.id}.png`) })
        record(spec.id, hasAsk ? 'ok' : 'fail', hasAsk ? '提问卡已出现' : '未看到提问卡', { preview: text.slice(0, 800) })
        if (hasAsk) {
          await page.getByTestId('ai-ask').locator('.ask__opt').first().click()
          await page.getByTestId('ai-ask-submit').click()
          await waitIdle(page, 60_000)
        }
        continue
      }
      const elapsed = await waitIdle(page, spec.timeoutMs ?? 180_000)
      const text = await drawerText(page)
      const ok = spec.expect.every((re) => re.test(text))
      await page.screenshot({ path: path.join(SHOT, `extra-${spec.id}.png`) })
      record(spec.id, ok ? 'ok' : 'fail', ok ? '断言通过' : '未匹配期望', { elapsed, preview: text.slice(0, 1200) })
    } catch (e) {
      const text = await drawerText(page)
      await page.screenshot({ path: path.join(SHOT, `extra-${spec.id}-err.png`) }).catch(() => {})
      record(spec.id, 'fail', e instanceof Error ? e.message : String(e), { preview: text.slice(0, 800) })
    }
    await sleep(20_000)
  }
} catch (e) {
  record('runner', 'fail', e instanceof Error ? e.message : String(e))
} finally {
  fs.writeFileSync(OUT, JSON.stringify({ results }, null, 2))
  await browser.close().catch(() => {})
}
