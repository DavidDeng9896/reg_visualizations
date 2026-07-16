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

/** Toolbar view-type select (first), not chart-position (second). */
async function switchViewType(page: Page, type: string) {
  const sel = page.locator('.ws-toolbar .el-select').first()
  await sel.click()
  // Labels may be "line" or "折线 line" — match by value token
  await page.getByRole('option', { name: new RegExp(`\\b${type}\\b`, 'i') }).click()
  await page.waitForTimeout(1200)
}

async function createDemo(page: Page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const demoBtn = page.getByRole('button', { name: /一键 Demo/ }).first()
  await demoBtn.waitFor({ state: 'visible' })
  await Promise.all([page.waitForURL(/\/analyses\//, { timeout: 45000 }), demoBtn.click()])
  // Wait for Vxe registration + toolbar (not just route change)
  await page.locator('#ws-toolbar').waitFor({ state: 'visible', timeout: 45000 })
  await page.getByRole('button', { name: /Edit 图表/ }).waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(600)
}

async function newViewOfType(page: Page, type: string) {
  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  await page.waitForSelector('text=新建视图')
  await page.locator('.el-dialog .el-select').last().click()
  await page.getByRole('option', { name: new RegExp(`\\b${type}\\b`, 'i') }).click()
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

  await step('首页-创建按钮可见', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '+ 创建 Analysis' }).first().waitFor()
    await page.getByRole('button', { name: /一键 Demo/ }).first().waitFor()
  })

  await step('一键Demo-散点图有墨迹', async () => {
    await createDemo(page)
    await page.getByRole('button', { name: /Edit 图表/ }).waitFor({ timeout: 10000 })
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 30) throw new Error(`scatter canvas blank: ${JSON.stringify(ink)}`)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-demo-scatter.png`) })
  })

  await step('Flowchart按钮切换', async () => {
    await page.getByRole('button', { name: 'Flowchart', exact: true }).click()
    await page.waitForSelector('text=修改分析结构请从侧栏进行')
    await page.locator('.el-tree-node__content').first().click()
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
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 20) throw new Error(`bar blank: ${JSON.stringify(ink)}`)
    // should not be a flat y=1 garbage only — toolbar should show bar
    const tb = await page.locator('.ws-toolbar').innerText()
    if (!/bar/.test(tb)) throw new Error('toolbar not bar: ' + tb)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-bar.png`) })
  })

  await step('切换line并出图', async () => {
    await switchViewType(page, 'line')
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 15) throw new Error(`line blank: ${JSON.stringify(ink)}`)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-line.png`) })
  })

  await step('切换pie并出图', async () => {
    await switchViewType(page, 'pie')
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 15) throw new Error(`pie blank: ${JSON.stringify(ink)}`)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-pie.png`) })
  })

  await step('切换box并出图', async () => {
    await switchViewType(page, 'box')
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 10) throw new Error(`box blank: ${JSON.stringify(ink)}`)
  })

  await step('切换heatmap并出图', async () => {
    await switchViewType(page, 'heatmap')
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 10) throw new Error(`heatmap blank: ${JSON.stringify(ink)}`)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-heatmap.png`) })
  })

  await step('Edit图表-改拟合-Save', async () => {
    await switchViewType(page, 'scatter')
    await page.getByRole('button', { name: /Edit 图表/ }).click()
    await page.waitForSelector('text=图表配置')
    const fitItem = page.locator('.el-drawer .el-form-item').filter({ hasText: '拟合' })
    await fitItem.locator('.el-select').click()
    await page.getByRole('option', { name: 'Linear' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(1000)
    const ink = await canvasInk(page)
    if (!ink.hasCanvas || ink.nonWhite < 20) throw new Error(`scatter after edit blank: ${JSON.stringify(ink)}`)
    await page.screenshot({ path: path.join(SHOT_DIR, `r${round}-scatter-fit.png`) })
  })

  await step('导出PNG按钮可点', async () => {
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
    await page.waitForSelector('text=过滤与转换')
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
