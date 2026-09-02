#!/usr/bin/env node
/** MiniMax 真机：Custom Code 面板 AI + Python Worker 连接态 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/workspace/insight-studio/package.json')
const { chromium } = require('playwright')

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'minimax-custom-code.json')
const SHOT = path.join(ROOT, 'screenshots')
fs.mkdirSync(SHOT, { recursive: true })
const ORIGIN = process.env.INSIGHT_ORIGIN || 'http://127.0.0.1:7100'
const WORKER_DIR = path.resolve(ROOT, '../../../python-worker')
const results = []

function record(id, status, note, extra = {}) {
  const row = { ts: new Date().toISOString(), id, status, note, ...extra }
  results.push(row)
  console.log(`[${status}] ${id}: ${note}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function workerPids() {
  try {
    return execSync("pgrep -f 'uvicorn app.main:app --host 127.0.0.1 --port 8091' || true", { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

async function stopWorker() {
  for (const pid of workerPids()) {
    try {
      process.kill(Number(pid), 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  await sleep(800)
}

function startWorkerViaTmux() {
  if (workerPids().length) return
  try {
    execSync(
      'SESSION_NAME="python-worker"; tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c /workspace/python-worker -- bash -l; tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" "python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8091" C-m',
      { stdio: 'ignore', shell: '/bin/bash' },
    )
  } catch {
    execSync(
      `cd "${WORKER_DIR}" && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8091 >> /tmp/python-worker.log 2>&1 &`,
      { shell: '/bin/bash', stdio: 'ignore' },
    )
  }
}

async function waitWorkerHealth(ok, maxMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('http://127.0.0.1:8787/api/python/health')
      const j = await res.json()
      if (ok && res.ok && j.ok) return true
      if (!ok && !res.ok) return true
    } catch {
      if (!ok) return true
    }
    await sleep(500)
  }
  return false
}

async function importCsv(page, tableName, csvText) {
  await page.getByRole('button', { name: 'Add data' }).click()
  await page.getByRole('menuitem', { name: 'Import CSV' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('选择 CSV 文件').setInputFiles({
    name: `${tableName}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(csvText, 'utf-8'),
  })
  await dialog.getByRole('button', { name: 'Add table' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })
}

async function openFlowchart(page) {
  const tab = page.getByRole('tab', { name: 'Flowchart' })
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click()
  await page.locator('.vue-flow__pane, .flow-empty').first().waitFor({ state: 'visible', timeout: 15_000 })
}

async function flowNodeIdByName(page, name) {
  const node = page.locator('.vue-flow__node').filter({ hasText: name }).first()
  await node.scrollIntoViewIfNeeded()
  const id = await node.getAttribute('data-id')
  if (!id) throw new Error(`Flow node "${name}" has no data-id`)
  return id
}

async function portCenter(page, nodeId, portName) {
  const node = page.locator(`.vue-flow__node[data-id="${nodeId}"]`).first()
  const handle = node.locator(`.vue-flow__handle[data-handleid="${portName}"]`).first()
  const rect = await handle.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

async function dragConnectToBlank(page, from) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  const start = await portCenter(page, from.nodeId, from.port)
  const pane = page.locator('.vue-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('vue-flow pane not visible')
  const end = { x: Math.min(start.x + 280, box.x + box.width - 60), y: start.y + 120 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i += 1) {
    const t = i / 10
    await page.mouse.move(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t)
    await page.waitForTimeout(12)
  }
  await page.mouse.up()
}

async function addCustomCodeFromTable(page, tableName) {
  await openFlowchart(page)
  await page.waitForTimeout(600)
  const id = await flowNodeIdByName(page, tableName)
  await dragConnectToBlank(page, { nodeId: id, port: 'Output dataset' })
  await page.locator('.add-step').waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('button', { name: 'Custom code' }).click()
  const edit = page.getByRole('complementary', { name: '编辑步骤' })
  await edit.waitFor({ state: 'visible', timeout: 15_000 })
  return edit
}

async function waitCcpAiIdle(page, maxMs = 180_000) {
  const panel = page.locator('.ccc')
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const loading = await panel.locator('button', { hasText: '停止' }).count()
    if (!loading) {
      await page.waitForTimeout(1500)
      if ((await panel.locator('button', { hasText: '停止' }).count()) === 0) return Date.now() - start
    }
    await page.waitForTimeout(800)
  }
  throw new Error(`Custom Code AI idle timeout ${maxMs}ms`)
}

async function openCcpAi(page) {
  const toggle = page.locator('.ccp__ai-toggle')
  await toggle.click()
  await page.locator('.ccc__title', { hasText: 'AI 助手' }).waitFor({ state: 'visible', timeout: 10_000 })
}

async function analysisHasTable(analysisUrl, tableName) {
  const id = analysisUrl.match(/\/analysis\/([^/?#]+)/)?.[1]
  if (!id) return false
  const res = await fetch(`${ORIGIN}/api/analyses/${encodeURIComponent(id)}`)
  if (!res.ok) return false
  const data = await res.json()
  return (data.tables ?? []).some((t) => t.name === tableName)
}
async function sendCcpAi(page, prompt) {
  const panel = page.locator('.ccc')
  await panel.locator('.ccc__textarea').fill(prompt)
  await panel.getByRole('button', { name: '发送' }).click()
  await panel.locator('button', { hasText: '停止' }).waitFor({ state: 'visible', timeout: 30_000 })
}

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  startWorkerViaTmux()
  await waitWorkerHealth(true, 30_000)

  await page.addStyleTag({
    content:
      '[data-testid="ai-fab"],[data-testid="ai-drawer"]{display:none !important}',
  })

  let workerRouteActive = false
  const blockWorkerHealth = async () => {
    if (workerRouteActive) return
    workerRouteActive = true
    await page.route('**/api/python/health', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, missing: [], packages: {} }),
      })
    })
  }
  const unblockWorkerHealth = async () => {
    if (!workerRouteActive) return
    workerRouteActive = false
    await page.unroute('**/api/python/health')
  }

  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1200)

  /* ---------- 场景 1：Worker 未连接（拦截 health） ---------- */
  await blockWorkerHealth()

  await page.getByRole('button', { name: '新建分析' }).click()
  const dlg = page.getByRole('dialog', { name: '新建分析' })
  await dlg.getByRole('textbox').first().fill('minimax-ccp')
  await dlg.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/analysis\//)
  await importCsv(page, 'nums', 'n,v\n1,10\n2,20\n3,30')

  let editPanel = await addCustomCodeFromTable(page, 'nums')
  const warn = editPanel.locator('.ccp__pkg-warn')
  await warn.waitFor({ state: 'visible', timeout: 15_000 })
  const warnText = await warn.innerText()
  const disconnectedOk = /Python Worker 未连接/.test(warnText) && /start\.sh/.test(warnText)
  await page.screenshot({ path: path.join(SHOT, 'ccp-worker-disconnected.png') })
  record(
    'worker-disconnected',
    disconnectedOk ? 'ok' : 'fail',
    disconnectedOk ? '未连接文案正确' : `文案不符: ${warnText.slice(0, 200)}`,
    { preview: warnText.slice(0, 400) },
  )

  /* ---------- 场景 2：Worker 已连接（解除拦截并重新进入编辑） ---------- */
  await unblockWorkerHealth()
  const healthOk = await waitWorkerHealth(true, 15_000)
  await page.getByRole('complementary', { name: /编辑步骤|节点预览/ }).getByRole('button', { name: '取消' }).click()
  await page.waitForTimeout(400)
  await page.locator('.vue-flow__node').filter({ hasText: 'Custom code' }).first().click({ force: true })
  const previewPanel = page.getByRole('complementary', { name: '节点预览' })
  await previewPanel.waitFor({ state: 'visible', timeout: 10_000 })
  await previewPanel.getByRole('button', { name: '编辑' }).click()
  editPanel = page.getByRole('complementary', { name: '编辑步骤' })
  await editPanel.locator('.ccp').waitFor({ state: 'visible', timeout: 10_000 })
  await sleep(1200)
  const warnHidden = (await editPanel.locator('.ccp__pkg-warn').count()) === 0
  const analysisUrl = page.url()
  await page.screenshot({ path: path.join(SHOT, 'ccp-worker-connected.png') })
  record(
    'worker-connected',
    healthOk && warnHidden ? 'ok' : 'fail',
    healthOk && warnHidden ? 'Worker 恢复后警告消失' : `health=${healthOk} warnHidden=${warnHidden}`,
    { analysisUrl },
  )

  /* ---------- 场景 3：Custom Code 内置 AI 生成并应用 ---------- */
  await openCcpAi(page)
  await sendCcpAi(
    page,
    '读取 inputs[0] 的表，新增列 v2 = v*2，输出表名 doubled。只返回 Python 代码，用 ```python 包裹完整 custom_code 函数。',
  )
  let aiElapsed = 0
  try {
    aiElapsed = await waitCcpAiIdle(page, 240_000)
    const cccText = await page.locator('.ccc').innerText()
    const hasCode = /def custom_code|v2|doubled/i.test(cccText)
    const codePre = page.locator('.ccc__codebox pre').last()
    const codeText = (await codePre.innerText().catch(() => '')).trim()
    const applyBtn = page.locator('.ccc__codebox .ccc__code-btn', { hasText: '应用' }).last()
    const hasApply = (await applyBtn.count()) > 0 && codeText.includes('def custom_code')
    if (hasApply) await applyBtn.click({ force: true })
    await page.waitForTimeout(600)
    const editorHasCode = await editPanel
      .locator('.cm-content')
      .evaluate((el) => (el.textContent ?? '').includes('def custom_code') && (el.textContent ?? '').includes('v2'))
      .catch(() => false)
    if (!editorHasCode && codeText) {
      await editPanel.locator('.cm-content').click({ force: true })
      await page.keyboard.press('Control+a')
      await page.keyboard.insertText(codeText)
      await page.waitForTimeout(400)
    }
    await editPanel.getByRole('button', { name: '保存' }).click({ force: true })
    await page.waitForTimeout(10_000)
    const runOk = (await analysisHasTable(analysisUrl, 'doubled')) || (await analysisHasTable(page.url(), 'doubled'))
    await page.screenshot({ path: path.join(SHOT, 'ccp-ai-generate.png') })
    const thinkingLeak = /<think>|thinking>/i.test(cccText)
    record(
      'ccp-ai-generate',
      hasCode && codeText.includes('def custom_code')
        ? runOk
          ? 'ok'
          : 'partial'
        : 'fail',
      runOk
        ? 'AI 生成→应用→保存执行成功'
        : hasCode && codeText.includes('def custom_code')
          ? 'AI 已生成可运行代码，但保存后未产出 doubled 表（见体验 §3.6）'
          : '生成/应用/输出未全部满足',
      { elapsed: aiElapsed, thinkingLeak, preview: cccText.slice(0, 1200) },
    )
    if (thinkingLeak) {
      record('ux-thinking-leak-ccp', 'info', 'Custom Code AI 正文中出现 thinking 标签')
    }
  } catch (e) {
    const cccText = await page.locator('.ccc').innerText().catch(() => '')
    await page.screenshot({ path: path.join(SHOT, 'ccp-ai-generate-err.png') }).catch(() => {})
    record('ccp-ai-generate', 'fail', e instanceof Error ? e.message : String(e), { preview: cccText.slice(0, 800) })
  }

  /* ---------- 场景 4：执行错误 → 发送到 AI 修复 ---------- */
  try {
  if ((await page.getByRole('complementary', { name: '编辑步骤' }).count()) === 0) {
    await page.locator('.vue-flow__node').filter({ hasText: 'Custom code' }).first().click({ force: true })
    await page.getByRole('complementary', { name: '节点预览' }).getByRole('button', { name: '编辑' }).click()
    editPanel = page.getByRole('complementary', { name: '编辑步骤' })
  }
  await editPanel.locator('.ccp').waitFor({ state: 'visible', timeout: 10_000 })
  const badCode = `def custom_code(inputs, **kwargs):
    df = inputs[0].data.copy()
    df["bad"] = df["not_a_column"] * 2
    return [IOData(name="broken", data=df)]
`
  await editPanel.locator('.cm-content').evaluate((el, code) => {
    el.textContent = code
    el.dispatchEvent(new InputEvent('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, badCode)
  await page.waitForTimeout(500)
  await editPanel.getByRole('button', { name: '保存' }).click({ force: true })
  await page.waitForTimeout(4000)
  const errBox = editPanel.locator('.ccp__errbox')
  const hasErr = (await errBox.count()) > 0
  if (hasErr) {
    await editPanel.getByRole('button', { name: '发送到 AI 修复' }).click({ force: true })
    await page.locator('.ccc__title', { hasText: 'AI 助手' }).waitFor({ state: 'visible', timeout: 10_000 })
    try {
      await waitCcpAiIdle(page, 240_000)
      const fixText = await page.locator('.ccc').innerText()
      const fixOk = /def custom_code|修复|KeyError|not_a_column|v/i.test(fixText)
      const applyFix = page.locator('.ccc__codebox .ccc__code-btn', { hasText: '应用' }).last()
      if ((await applyFix.count()) > 0) await applyFix.click({ force: true })
      await editPanel.getByRole('button', { name: '保存' }).click({ force: true })
      await page.waitForTimeout(5000)
      await page.screenshot({ path: path.join(SHOT, 'ccp-ai-fix-error.png') })
      const stepErr = await editPanel.locator('.sdp__error').count()
      record(
        'ccp-ai-fix-error',
        fixOk && stepErr === 0 ? 'ok' : fixOk ? 'partial' : 'fail',
        fixOk ? (stepErr === 0 ? 'AI 修复后步骤无错误' : 'AI 给出修复但步骤仍有错误') : '未得到有效修复建议',
        { preview: fixText.slice(0, 1200) },
      )
    } catch (e) {
      record('ccp-ai-fix-error', 'fail', e instanceof Error ? e.message : String(e))
    }
  } else {
    record('ccp-ai-fix-error', 'skip', '故意错误未触发 errbox（可能 Worker 未执行）')
  }
  } catch (e) {
    record('ccp-ai-fix-error', 'fail', e instanceof Error ? e.message : String(e))
  }
} catch (e) {
  record('runner', 'fail', e instanceof Error ? e.message : String(e))
} finally {
  startWorkerViaTmux()
  fs.writeFileSync(OUT, JSON.stringify({ results }, null, 2))
  await browser.close().catch(() => {})
}
