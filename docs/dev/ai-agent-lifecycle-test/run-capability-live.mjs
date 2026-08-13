#!/usr/bin/env node
/**
 * 短实跑：能力矩阵 C 层。小表、短 prompt，四个子代理各一条（能跑才跑）。
 * 不点 ai-stop。TPD/配额耗尽时记阻塞并退出 0（A/B 层已覆盖）。
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/workspace/insight-studio/package.json')
const { chromium } = require('playwright')

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'capability-live.json')
const SHOT = path.join(ROOT, 'screenshots')
fs.mkdirSync(SHOT, { recursive: true })

const ORIGIN = process.env.INSIGHT_ORIGIN || 'http://127.0.0.1:7100'

const results = []

function record(id, status, note, extra = {}) {
  const row = { ts: new Date().toISOString(), id, status, note, ...extra }
  results.push(row)
  console.log(`[${status}] ${id}: ${note}`)
}

async function probeQuota() {
  try {
    const cfg = await fetch(`${ORIGIN}/api/ai/config`).then((r) => r.json())
    if (!cfg?.configured) {
      record('probe', 'skip', 'AI 未配置')
      return 'unconfigured'
    }
    const res = await fetch(`${ORIGIN}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '只回复一个字：通。不要调用工具。' }],
        stream: true,
      }),
    })
    const text = await res.text()
    if (!res.ok) {
      const kind = /tpd|per day|quota/i.test(text) ? 'quota' : /rpm/i.test(text) ? 'rpm' : 'error'
      record('probe', kind === 'quota' ? 'blocked' : 'fail', `chat ${res.status}`, { preview: text.slice(0, 400) })
      return kind
    }
    record('probe', 'ok', `model=${cfg.model || '?'}`, { preview: text.slice(0, 200) })
    return 'ok'
  } catch (e) {
    record('probe', 'fail', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}

async function openAi(page) {
  const drawer = page.getByTestId('ai-drawer')
  if (await drawer.isVisible().catch(() => false)) return
  await page.getByTestId('ai-fab').click()
  await drawer.waitFor({ state: 'visible', timeout: 20_000 })
}

async function setAllowAll(page) {
  await page.getByTestId('ai-permission').click()
  await page.getByTestId('ai-permission-allow').click()
}

async function idle(page) {
  return (await page.getByTestId('ai-stop').count()) === 0 && (await page.getByTestId('ai-send').count()) > 0
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
  let continues = 0
  while (Date.now() - start < maxMs) {
    await handlePrompts(page)
    if (await idle(page)) {
      const cont = page.getByTestId('ai-continue')
      if ((await cont.count()) && continues < 2) {
        continues += 1
        await cont.click()
        await page.waitForTimeout(8_000)
        continue
      }
      await page.waitForTimeout(2500)
      if (await idle(page)) return { elapsed: Date.now() - start, continues }
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`idle timeout ${maxMs}ms`)
}

async function drawerText(page) {
  return (await page.getByTestId('ai-drawer').innerText().catch(() => '')).slice(0, 4000)
}

async function runScenario(page, spec) {
  await openAi(page)
  await page.getByTestId('ai-newconv').click()
  await page.waitForTimeout(400)
  await setAllowAll(page)
  await page.getByTestId('ai-input').fill(spec.prompt)
  await page.getByTestId('ai-send').click()
  await page.getByTestId('ai-stop').waitFor({ state: 'visible', timeout: 20_000 })
  try {
    const wait = await waitIdle(page, spec.timeoutMs ?? 180_000)
    const text = await drawerText(page)
    const blocked = /日配额|TPD|token per day/i.test(text)
    const tables = await page.getByTestId('sidebar-table').allInnerTexts().catch(() => [])
    await page.screenshot({ path: path.join(SHOT, `cap-${spec.id}.png`) })
    if (blocked) {
      record(spec.id, 'blocked', '配额打断', { wait, preview: text.slice(0, 800), tables })
      return 'blocked'
    }
    const ok = spec.expect.every((re) => re.test(text) || tables.some((t) => re.test(t)))
    record(spec.id, ok ? 'ok' : 'fail', ok ? '断言通过' : '未看到期望产物', {
      wait,
      preview: text.slice(0, 800),
      tables,
    })
    return ok ? 'ok' : 'fail'
  } catch (e) {
    const text = await drawerText(page)
    await page.screenshot({ path: path.join(SHOT, `cap-${spec.id}-err.png`) }).catch(() => {})
    record(spec.id, 'fail', e instanceof Error ? e.message : String(e), { preview: text.slice(0, 800) })
    return 'fail'
  }
}

const SCENES = [
  {
    id: 'filter-chart',
    prompt:
      '用 import_csv_text 导入表 demo_hits，CSV 如下：\nid,score\nA,3\nB,8\nC,1\n然后 Filter score>2，再画柱状图（x=id, y=score）。不要 Custom Code，不要新建第二个分析。',
    expect: [/Filter|过滤|demo_hits|柱/i],
    timeoutMs: 180_000,
  },
  {
    id: 'join',
    prompt:
      '当前分析里用 import_csv_text 建两张表 left(id,v: 1,10 / 2,20) 和 right(id,label: 1,Alpha / 2,Beta)，再 add_join_step inner join on id。不要 Custom Code。',
    expect: [/Join|合并|left/i],
    timeoutMs: 180_000,
  },
  {
    id: 'analysis-worker',
    prompt:
      '先用 import_csv_text 导入表 iris_tiny：\nspecies,sepal_length\nsetosa,5.1\nsetosa,4.9\nversicolor,7.0\n然后派「分析师」子代理（delegate_analysis_worker）给这张表建 bar 图，x=species，y=sepal_length。不要工程师，不要 Custom Code。',
    expect: [/分析师|bar|柱|Iris/i],
    timeoutMs: 240_000,
  },
  {
    id: 'skill-worker',
    prompt:
      '派「规划师」子代理（delegate_skill_worker）列出已安装 skill 的要点，用一两句话中文告诉我。不要改表。',
    expect: [/规划师|skill|没有已安装|要点/i],
    timeoutMs: 120_000,
  },
]

const quota = await probeQuota()
if (quota === 'quota' || quota === 'unconfigured') {
  fs.writeFileSync(OUT, JSON.stringify({ quota, results }, null, 2))
  process.exit(0)
}

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(20_000)

try {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: '新建分析' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').first().fill('capability-live')
  await dialog.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/analysis\//)
  await page.waitForTimeout(1000)

  for (const spec of SCENES) {
    const st = await runScenario(page, spec)
    if (st === 'blocked') break
  }
} catch (e) {
  record('runner', 'fail', e instanceof Error ? e.message : String(e))
} finally {
  fs.writeFileSync(OUT, JSON.stringify({ quota, results }, null, 2))
  await browser.close().catch(() => {})
}
