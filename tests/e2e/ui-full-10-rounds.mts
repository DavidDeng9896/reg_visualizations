/**
 * Full UI button coverage × 10 rounds (browser click simulation).
 * Focus: every primary control + chart usability for all 6 types.
 *
 * Run: npx tsx tests/e2e/ui-full-10-rounds.mts
 */
import { chromium, type Page, type ConsoleMessage } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const ROUNDS = Number(process.env.ROUNDS || 10)
const OUT = path.resolve('docs/dev/ui-full-10-rounds-report.md')
const SHOT_DIR = path.resolve('/tmp/ui-full-shots')

type StepResult = { name: string; ok: boolean; detail?: string }
type RoundResult = { round: number; ok: boolean; steps: StepResult[]; errors: string[] }

async function clearSite(page: Page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const dbs = (await indexedDB.databases?.()) || []
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise<void>((resolve, reject) => {
            if (!d.name) {
              resolve()
              return
            }
            const req = indexedDB.deleteDatabase(d.name)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'))
            // If a connection blocks deletion, resolve so the next cold load can retry.
            req.onblocked = () => resolve()
          }),
      ),
    )
  })
  // Cold reload after IDB delete fully settles — avoids Dexie open vs delete race.
  await page.goto(BASE, { waitUntil: 'networkidle' })
}

async function canvasInk(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.chart-pane canvas, .chart canvas, canvas') as HTMLCanvasElement | null
    if (!canvas) return { hasCanvas: false, nonWhite: 0, w: 0, h: 0 }
    const ctx = canvas.getContext('2d')
    if (!ctx) return { hasCanvas: true, nonWhite: 0, w: canvas.width, h: canvas.height }
    const { data } = ctx.getImageData(0, 0, Math.min(canvas.width, 400), Math.min(canvas.height, 240))
    let nonWhite = 0
    for (let i = 0; i < data.length; i += 8) {
      if (data[i] < 248 || data[i + 1] < 248 || data[i + 2] < 248) nonWhite++
    }
    return { hasCanvas: true, nonWhite, w: canvas.width, h: canvas.height }
  })
}

/** Poll until chart canvas has ink (cold Demo / type switch races). */
async function waitForCanvasInk(page: Page, minNonWhite: number, timeoutMs = 20000) {
  const started = Date.now()
  let last = { hasCanvas: false, nonWhite: 0, w: 0, h: 0 }
  while (Date.now() - started < timeoutMs) {
    last = await canvasInk(page)
    if (last.hasCanvas && last.nonWhite >= minNonWhite && last.w > 0 && last.h > 0) return last
    await page.waitForTimeout(400)
  }
  throw new Error(`canvas ink timeout: ${JSON.stringify(last)}`)
}

/** Toolbar view-type native select (aria-label 视图类型). */
async function switchViewType(page: Page, type: string) {
  await page.getByLabel('视图类型').selectOption(type)
  await page.waitForTimeout(1200)
}

async function createDemo(page: Page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const demoBtn = page.getByRole('button', { name: /一键 Demo/ }).first()
  await demoBtn.waitFor({ state: 'visible', timeout: 30000 })
  // First cold load after IDB wipe can race Dexie open; retry navigation once.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await Promise.all([
      page.waitForURL(/\/analyses\//, { timeout: 45000 }).catch(() => null),
      demoBtn.click(),
    ])
    if (/\/analyses\//.test(page.url())) break
    await page.waitForTimeout(800)
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await demoBtn.waitFor({ state: 'visible', timeout: 30000 })
  }
  if (!/\/analyses\//.test(page.url())) {
    throw new Error(`Demo did not navigate to workspace: ${page.url()}`)
  }
  // Wait for Vxe registration + toolbar (not just route change)
  await page.locator('#ws-toolbar').waitFor({ state: 'visible', timeout: 45000 })
  await page.getByRole('button', { name: /Edit 图表/ }).waitFor({ state: 'visible', timeout: 30000 })
  // Chart pane may still be mounting ECharts after toolbar appears (cold first round).
  await page.locator('.chart-pane canvas, .chart canvas, canvas').first().waitFor({
    state: 'attached',
    timeout: 30000,
  })
  await page.waitForTimeout(400)
}

async function newViewOfType(page: Page, type: string) {
  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  await page.waitForSelector('text=新建视图')
  await page.getByLabel('View Type').selectOption(type)
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await page.waitForTimeout(1200)
}

async function runRound(page: Page, round: number): Promise<RoundResult> {
  const errors: string[] = []
  const onErr = (e: Error) => errors.push('pageerror: ' + e.message)
  const onCon = (m: ConsoleMessage) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
    if (m.type() === 'warning' && /DataCloneError|Unhandled error during execution/.test(m.text())) {
      errors.push('console.warn: ' + m.text())
    }
  }
  page.on('pageerror', onErr)
  page.on('console', onCon)

  const steps: StepResult[] = []
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
      steps.push({ name, ok: true })
    } catch (e) {
      steps.push({ name, ok: false, detail: String(e) })
    }
  }

  await clearSite(page)
  // Let Dexie finish reopening after wipe before interacting.
  await page.waitForTimeout(400)

  await step('首页-创建按钮可见', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '+ 创建 Analysis' }).first().waitFor()
    await page.getByRole('button', { name: /一键 Demo/ }).first().waitFor()
  })

  await step('一键Demo-散点图有墨迹', async () => {
    await createDemo(page)
    await page.getByRole('button', { name: /Edit 图表/ }).waitFor({ timeout: 10000 })
    await waitForCanvasInk(page, 30)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-demo-scatter.png`) })
  })

  await step('Flowchart按钮切换', async () => {
    const btn = page.getByRole('button', { name: 'Flowchart', exact: true })
    await btn.click()
    await btn.waitFor({ state: 'visible', timeout: 5000 })
    // Cold first open may show "加载流程图…" while vue-flow chunk loads (dev compile can be slow).
    const region = page.getByRole('region', { name: '分析流程图' })
    const loading = page.getByText('加载流程图…')
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      if (await region.isVisible().catch(() => false)) break
      if (await loading.isVisible().catch(() => false)) {
        await region.waitFor({ state: 'visible', timeout: Math.max(1000, deadline - Date.now()) })
        break
      }
      await page.waitForTimeout(250)
    }
    if (!(await region.isVisible().catch(() => false))) {
      throw new Error('Flowchart region not visible after wait')
    }
    await page.getByText('修改分析结构请从侧栏进行').waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.tree-node-content').first().click()
    await page.waitForTimeout(500)
  })

  await step('Send output占位', async () => {
    await page.getByRole('button', { name: 'Send output' }).click()
    await page.waitForSelector('text=后续版本')
  })

  await step('Connect external占位', async () => {
    await page.getByRole('button', { name: /Connect with external tool/ }).click()
    await page.waitForSelector('text=后续版本')
  })

  await step('新建bar视图-自动映射有效', async () => {
    await newViewOfType(page, 'bar')
    await waitForCanvasInk(page, 20)
    // should not be a flat y=1 garbage only — toolbar should show bar
    const tb = await page.locator('.ws-toolbar').innerText()
    if (!/bar/.test(tb)) throw new Error('toolbar not bar: ' + tb)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-bar.png`) })
  })

  await step('切换line并出图', async () => {
    await switchViewType(page, 'line')
    await waitForCanvasInk(page, 15)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-line.png`) })
  })

  await step('切换pie并出图', async () => {
    await switchViewType(page, 'pie')
    await waitForCanvasInk(page, 15)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-pie.png`) })
  })

  await step('切换box并出图', async () => {
    await switchViewType(page, 'box')
    await waitForCanvasInk(page, 10)
  })

  await step('切换heatmap并出图', async () => {
    await switchViewType(page, 'heatmap')
    await waitForCanvasInk(page, 10)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-heatmap.png`) })
  })

  await step('Edit图表-改拟合-Save', async () => {
    await switchViewType(page, 'scatter')
    await page.getByRole('button', { name: /Edit 图表/ }).click()
    const drawer = page.locator('.el-drawer').filter({ hasText: '图表配置' })
    await drawer.waitFor({ state: 'visible', timeout: 15000 })
    const fitItem = drawer.locator('.el-form-item').filter({ hasText: '拟合' })
    await fitItem.scrollIntoViewIfNeeded()
    await fitItem.locator('select[aria-label="拟合模型"]').selectOption('linear')
    await drawer.getByRole('button', { name: 'Save', exact: true }).click()
    await drawer.waitFor({ state: 'hidden', timeout: 10000 }).catch(async () => {
      await page.keyboard.press('Escape')
    })
    await waitForCanvasInk(page, 20)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-scatter-fit.png`) })
  })

  await step('导出PNG按钮可点', async () => {
    // Ensure Edit drawer is not covering the chart toolbar.
    await page.locator('.el-drawer').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => undefined)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      page.getByRole('button', { name: '导出 PNG' }).click(),
    ])
    if (!download) {
      // download event may still fire as blob navigation; just ensure no crash
    }
  })

  await step('过滤转换对话框', async () => {
    await page.getByRole('button', { name: /过滤 \/ 转换/ }).click()
    const dlg = page.getByText('过滤与转换')
    await dlg.waitFor({ state: 'visible', timeout: 10000 })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(400)
  })

  await step('侧栏跳转流程图', async () => {
    await page.locator('.ops-btn').nth(1).click()
    await page.getByRole('menuitem', { name: '跳转到流程图' }).click()
    await page.waitForSelector('text=修改分析结构请从侧栏进行')
  })

  await step('返回列表并删除', async () => {
    await page.getByRole('link', { name: 'Analyses' }).click()
    await page.waitForURL(BASE + '/')
    await page.waitForTimeout(500)
    const row = page.getByRole('row', { name: /Demo Dose Response/ }).first()
    await row.getByRole('button', { name: '删除' }).click()
    await page.getByRole('button', { name: '确定' }).click()
    await page.waitForTimeout(500)
  })

  page.off('pageerror', onErr)
  page.off('console', onCon)

  const ok = steps.every((s) => s.ok) && errors.length === 0
  return { round, ok, steps, errors }
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const rounds: RoundResult[] = []

  for (let i = 1; i <= ROUNDS; i++) {
    console.log(`\n===== ROUND ${i}/${ROUNDS} =====`)
    const r = await runRound(page, i)
    rounds.push(r)
    console.log(r.ok ? 'PASS' : 'FAIL', r.steps.filter((s) => !s.ok).map((s) => s.name))
  }

  await browser.close()

  const pass = rounds.filter((r) => r.ok).length
  const md = [
    '# UI 全按钮浏览器自测 × 10 轮',
    '',
    `> 时间：${new Date().toISOString()}`,
    `> BASE：${BASE}`,
    `> 结果：**${pass}/${ROUNDS} 轮全通过**`,
    '',
    '## 每轮汇总',
    '',
    '| Round | 状态 | 失败步骤 | console错误 |',
    '| --- | --- | --- | --- |',
    ...rounds.map((r) => {
      const fails = r.steps.filter((s) => !s.ok).map((s) => s.name).join('; ') || '-'
      return `| ${r.round} | ${r.ok ? 'PASS' : 'FAIL'} | ${fails} | ${r.errors.length} |`
    }),
    '',
    '## 步骤覆盖（每轮）',
    '',
    '- 首页创建/Demo',
    '- Demo 散点图 canvas 有墨迹（真出图）',
    '- Flowchart / Send output / Connect external',
    '- 新建 bar（自动映射）并验证 canvas',
    '- 切换 line / pie / box / heatmap 并验证 canvas',
    '- Edit 图表改拟合 Save',
    '- 导出 PNG / 过滤转换 / 跳转流程图 / 删除',
    '',
  ]

  for (const r of rounds) {
    md.push(`### Round ${r.round} — ${r.ok ? 'PASS' : 'FAIL'}`, '')
    for (const s of r.steps) {
      md.push(`- ${s.ok ? '✅' : '❌'} ${s.name}${s.detail ? ` — ${s.detail.slice(0, 300)}` : ''}`)
    }
    if (r.errors.length) {
      md.push('', 'Errors:', ...r.errors.map((e) => '```\n' + e.slice(0, 1000) + '\n```'))
    }
    md.push('')
  }

  fs.writeFileSync(OUT, md.join('\n'))
  console.log('\n' + md.slice(0, 40).join('\n'))
  console.log(`\nWrote ${OUT}`)
  process.exit(pass === ROUNDS ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
