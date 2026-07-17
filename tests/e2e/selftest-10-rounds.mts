/**
 * 10-round systematic self-test for Insight Analysis (round 2 after fixes).
 * Run: npx tsx tests/e2e/selftest-10-rounds.mts
 */
import { chromium, type Page, type ConsoleMessage } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const OUT = path.resolve('docs/dev/selftest-10-rounds-report.md')

type Finding = {
  round: number
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  errors: string[]
  notes: string[]
}

const findings: Finding[] = []

function collectors(page: Page) {
  const errors: string[] = []
  const notes: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}\n${err.stack || ''}`))
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
    if (msg.type() === 'warning' && /Unhandled error|DataCloneError|could not be cloned/.test(msg.text())) {
      errors.push(`console.warn: ${msg.text()}`)
    }
  })
  return { errors, notes }
}

async function clearSite(page: Page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const dbs = await indexedDB.databases?.()
    if (dbs) {
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name)
      }
    }
  })
}

async function round(
  n: number,
  name: string,
  page: Page,
  fn: (page: Page, ctx: { errors: string[]; notes: string[] }) => Promise<void>,
) {
  const ctx = collectors(page)
  try {
    await fn(page, ctx)
    findings.push({
      round: n,
      name,
      status: ctx.errors.length ? 'FAIL' : 'PASS',
      errors: [...ctx.errors],
      notes: [...ctx.notes],
    })
  } catch (e) {
    findings.push({
      round: n,
      name,
      status: 'FAIL',
      errors: [...ctx.errors, `throw: ${String(e)}`],
      notes: [...ctx.notes],
    })
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await round(1, '首页渲染：标题与创建按钮可见', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.waitForSelector('text=Insight Analysis', { timeout: 10000 })
    await p.waitForSelector('text=+ 创建 Analysis', { timeout: 5000 })
    ctx.notes.push(`url=${p.url()}`)
  })

  await round(2, '创建空 Analysis 并进入工作区', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: '+ 创建 Analysis' }).click()
    await p.getByPlaceholder('例如 Dose Response').fill('SelfTest Empty')
    await p.getByRole('button', { name: '创建', exact: true }).click()
    await p.waitForURL(/\/analyses\//, { timeout: 10000 })
    await p.waitForSelector('text=ANALYSIS DATA', { timeout: 10000 })
    ctx.notes.push(`url=${p.url()}`)
  })

  await round(3, '一键 Demo：进入工作区无 DataCloneError', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /一键 Demo/ }).click()
    await p.waitForURL(/\/analyses\//, { timeout: 15000 })
    await p.waitForSelector('text=Flowchart', { timeout: 10000 })
    await p.waitForTimeout(1500)
    ctx.notes.push(`url=${p.url()}`)
    const bodyText = await p.locator('body').innerText()
    if (/应用加载出错|DataCloneError|could not be cloned/.test(bodyText)) {
      ctx.errors.push('UI shows clone/bootstrap error text')
    }
    const tree = await p.locator('.sidebar-tree').innerText()
    ctx.notes.push(`tree=${tree.replace(/\n/g, ' | ')}`)
    if (!/demo_dose_response|Scatter/i.test(tree)) {
      ctx.errors.push('Demo table/view missing from sidebar after navigate')
    }
  })

  await round(4, 'Demo 后切换 Flowchart / Workspace', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /一键 Demo/ }).click()
    await p.waitForURL(/\/analyses\//, { timeout: 15000 })
    await p.waitForTimeout(1000)
    await p.getByRole('button', { name: 'Flowchart', exact: true }).click()
    await p.getByRole('region', { name: '分析流程图' }).waitFor({ state: 'visible', timeout: 45000 })
    await p.waitForTimeout(800)
    if (!(await p.locator('text=修改分析结构请从侧栏进行').count())) {
      ctx.errors.push('flowchart banner missing')
    }
    await p.locator('.tree-node-content').first().click()
    await p.waitForTimeout(800)
  })

  await round(5, 'CSV 上传创建表', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: '+ 创建 Analysis' }).click()
    await p.getByPlaceholder('例如 Dose Response').fill('CSV Test')
    await p.getByRole('button', { name: '创建', exact: true }).click()
    await p.waitForURL(/\/analyses\//)
    await p.getByRole('button', { name: '+ Add data' }).click()
    await p.getByLabel('+ Add data').getByText('From CSV').click()
    await p.waitForSelector('text=Upload CSV')
    const filePath = '/tmp/selftest.csv'
    fs.writeFileSync(filePath, 'name,value\nalpha,1\nbeta,2\ngamma,3\n')
    await p.locator('input[type=file]').first().setInputFiles(filePath)
    await p.waitForTimeout(600)
    await p.getByRole('button', { name: 'Add table' }).click()
    await p.waitForTimeout(1000)
    const tree = await p.locator('.sidebar-tree').innerText()
    ctx.notes.push(`tree=${tree}`)
    if (!/selftest/i.test(tree)) ctx.errors.push(`CSV table not in sidebar: ${tree}`)
  })

  await round(6, '侧栏 New view 创建柱状图视图', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /一键 Demo/ }).click()
    await p.waitForURL(/\/analyses\//)
    await p.waitForTimeout(1200)
    await p.waitForSelector('.ops-btn', { timeout: 10000 })
    await p.locator('.ops-btn').first().click()
    await p.getByRole('menuitem', { name: 'New view' }).click()
    await p.waitForSelector('text=新建视图')
    await p.getByLabel('View Type').selectOption('bar')
    await p.getByRole('button', { name: '创建', exact: true }).click()
    await p.waitForTimeout(1000)
    const tree = await p.locator('.sidebar-tree').innerText()
    ctx.notes.push(`tree=${tree.replace(/\n/g, ' | ')}`)
    if (!/\(bar\)/.test(tree)) ctx.errors.push('bar view not found in tree')
  })

  await round(7, '打开 Edit 图表并 Save', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /一键 Demo/ }).click()
    await p.waitForURL(/\/analyses\//)
    await p.waitForTimeout(1500)
    const editBtn = p.getByRole('button', { name: /Edit 图表/ })
    await editBtn.waitFor({ timeout: 10000 })
    await editBtn.click()
    await p.waitForSelector('text=图表配置')
    await p.getByRole('button', { name: 'Save', exact: true }).click()
    await p.waitForTimeout(500)
  })

  await round(8, '过滤/转换对话框打开与 Save', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /一键 Demo/ }).click()
    await p.waitForURL(/\/analyses\//)
    await p.waitForTimeout(1200)
    await p.locator('.tree-node-content', { hasText: 'Scatter' }).first().click()
    await p.waitForTimeout(400)
    await p.getByRole('button', { name: /过滤 \/ 转换/ }).click()
    await p.waitForSelector('text=过滤与转换')
    await p.getByRole('button', { name: '+ 过滤' }).click()
    await p.getByRole('button', { name: 'Save', exact: true }).click()
    await p.waitForTimeout(500)
  })

  await round(9, '刷新后 Analysis 仍在列表（IndexedDB）', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: '+ 创建 Analysis' }).click()
    await p.getByPlaceholder('例如 Dose Response').fill('Persist Me')
    await p.getByRole('button', { name: '创建', exact: true }).click()
    await p.waitForURL(/\/analyses\//)
    await p.waitForTimeout(800)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    const text = await p.locator('body').innerText()
    if (!text.includes('Persist Me')) ctx.errors.push('Persist Me missing after reload')
  })

  await round(10, '删除 Analysis', page, async (p, ctx) => {
    await clearSite(p)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: '+ 创建 Analysis' }).click()
    await p.getByPlaceholder('例如 Dose Response').fill('Delete Me')
    await p.getByRole('button', { name: '创建', exact: true }).click()
    await p.waitForURL(/\/analyses\//)
    await p.goto(BASE, { waitUntil: 'networkidle' })
    await p.waitForSelector('text=Delete Me')
    await p.getByRole('row', { name: /Delete Me/ }).getByRole('button', { name: '删除' }).click()
    await p.getByRole('dialog').getByRole('button', { name: '删除' }).click()
    await p.waitForTimeout(600)
    const text = await p.locator('body').innerText()
    if (text.includes('Delete Me')) ctx.errors.push('Delete Me still present')
  })

  await browser.close()

  const passed = findings.filter((f) => f.status === 'PASS').length
  const failed = findings.filter((f) => f.status === 'FAIL').length
  const md = [
    '# Insight Analysis 自测报告（10 轮）',
    '',
    `> 生成时间：${new Date().toISOString()}`,
    `> BASE_URL：${BASE}`,
    `> 结果：**${passed} PASS / ${failed} FAIL**`,
    '',
    '## 汇总',
    '',
    '| Round | 场景 | 状态 | 错误数 |',
    '| --- | --- | --- | --- |',
    ...findings.map((f) => `| ${f.round} | ${f.name} | ${f.status} | ${f.errors.length} |`),
    '',
    '## 详细证据',
    '',
  ]
  for (const f of findings) {
    md.push(`### Round ${f.round}: ${f.name} — ${f.status}`, '')
    if (f.notes.length) md.push('Notes:', ...f.notes.map((n) => `- ${n}`), '')
    if (f.errors.length) md.push('Errors:', ...f.errors.map((e) => '```\n' + e.slice(0, 2000) + '\n```'), '')
    else md.push('No errors collected.', '')
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, md.join('\n'))
  console.log(md.join('\n'))
  console.log(`\nWrote ${OUT}`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
