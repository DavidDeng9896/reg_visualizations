/**
 * UI 一致性实机取证：关键面截图 + 计算样式抽检（色/字号/圆角是否落在 token 范围）。
 * 运行：cd insight-studio && npx tsx tests/manual/ui-consistency.mts
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.UI_BASE_URL ?? 'http://127.0.0.1:7100'
const OUT = process.env.UI_OUT ?? '/opt/cursor/artifacts/ui-consistency'

/** DESIGN.md / tokens.css 期望值 */
const EXPECT = {
  primary: '#1e2a78',
  accent: '#2e5bff',
  accentSoft: '#edf1fe',
  bg: '#f7f8fa',
  surface: '#ffffff',
  border: '#e4e7ec',
  text: '#1d2939',
  textSecondary: '#667085',
  radius: '8px',
  radiusSm: '6px',
  fontSm: '13px',
  fontXs: '12px',
  headerFrom: '#3a80ef',
  segBg: '#eaecf0',
}

type Finding = { severity: 'error' | 'warn' | 'info'; area: string; message: string }
const findings: Finding[] = []
const shots: string[] = []

function normColor(c: string): string {
  const ctx = { c }
  // rgb(a) → hex approx via canvas in page; here just normalize hex lower
  if (c.startsWith('#')) return c.toLowerCase()
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return c.toLowerCase().replace(/\s/g, '')
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function near(a: string, b: string): boolean {
  return normColor(a) === normColor(b)
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  shots.push(file)
  return file
}

async function css(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    // —— 首页 / 分析列表 ——
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByTestId('analysis-card').first().waitFor({ state: 'visible' })
    await shot(page, '01-analysis-list')

    const headerBg = await page.locator('.app-header, header').first().evaluate((el) => getComputedStyle(el).backgroundImage || getComputedStyle(el).backgroundColor)
    if (!/linear-gradient|3a80ef|2062e6/i.test(headerBg) && !headerBg.includes('rgb')) {
      findings.push({ severity: 'warn', area: 'AppHeader', message: `头部背景非预期渐变: ${headerBg}` })
    } else {
      findings.push({ severity: 'info', area: 'AppHeader', message: `头部背景 OK` })
    }

    const segBg = await css(page, '.side__seg', 'background-color')
    if (!near(segBg, EXPECT.segBg)) {
      findings.push({ severity: 'warn', area: 'ShellSidebar', message: `分段容器背景 ${normColor(segBg)} ≠ token ${EXPECT.segBg}` })
    } else {
      findings.push({ severity: 'info', area: 'ShellSidebar', message: '分段容器 #eaecf0 符合 DESIGN' })
    }

    const cardBorder = await css(page, '[data-testid="analysis-card"]', 'border-top-color')
    const cardRadius = await css(page, '[data-testid="analysis-card"]', 'border-radius')
    if (!near(cardBorder, EXPECT.border) && !near(cardBorder, '#e8ecf1')) {
      findings.push({ severity: 'warn', area: 'AnalysisCard', message: `卡片边框 ${normColor(cardBorder)} 偏离 ${EXPECT.border}` })
    }
    if (cardRadius && !['8px', '6px'].includes(cardRadius.split(' ')[0])) {
      findings.push({ severity: 'warn', area: 'AnalysisCard', message: `卡片圆角 ${cardRadius} 非 8/6px` })
    }

    // —— 分析工作区 ——
    await page.getByTestId('analysis-card').filter({ hasText: '抗体纯化工艺分析' }).first().click()
    await page.waitForURL(/\/analysis\//)
    await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
    await page.getByTestId('sidebar-table').filter({ hasText: 'Purification' }).first().click()
    await page.getByTestId('grid-stats').waitFor({ state: 'visible' })
    await shot(page, '02-workspace-table')

    const titleSize = await css(page, '.ws__title', 'font-size')
    const titleWeight = await css(page, '.ws__title', 'font-weight')
    if (titleSize !== '18px') {
      findings.push({ severity: 'info', area: 'Workspace', message: `分析标题字号 ${titleSize}（DESIGN 未强制，工作区/看板均为 18px 即可一致）` })
    }
    const createBtn = page.getByRole('button', { name: '创建图表' })
    if (await createBtn.isVisible()) {
      const bg = await createBtn.evaluate((el) => getComputedStyle(el).backgroundColor)
      if (!near(bg, EXPECT.primary)) {
        findings.push({ severity: 'error', area: 'IButton.primary', message: `主按钮背景 ${normColor(bg)} ≠ ${EXPECT.primary}` })
      } else {
        findings.push({ severity: 'info', area: 'IButton.primary', message: '主按钮 #1e2a78 符合 token' })
      }
    }

    // 树选中态
    const selected = page.locator('.tnode__row--selected, .vnode__row--selected').first()
    if (await selected.count()) {
      const selBg = await selected.evaluate((el) => getComputedStyle(el).backgroundColor)
      if (!near(selBg, EXPECT.accentSoft) && !normColor(selBg).includes('edf1fe')) {
        // 允许轻微差异
        findings.push({ severity: 'warn', area: 'SidebarTree', message: `选中行背景 ${normColor(selBg)} 宜接近 accent-soft ${EXPECT.accentSoft}` })
      } else {
        findings.push({ severity: 'info', area: 'SidebarTree', message: '选中行浅蓝底一致' })
      }
    }

    // —— 图表视图 ——
    const view = page.getByTestId('sidebar-view').filter({ hasText: '各步骤收率' }).first()
    if (await view.count()) {
      await view.click()
      await page.waitForTimeout(800)
      await shot(page, '03-workspace-chart')
    }

    // —— Flowchart ——
    const flowBtn = page.getByRole('button', { name: /Flowchart/i }).first()
    if (await flowBtn.isVisible()) {
      await flowBtn.click()
      await page.waitForTimeout(1000)
      await shot(page, '04-flowchart')
      await flowBtn.click()
      await page.waitForTimeout(400)
    }

    // —— AI 抽屉 + 历史 ——
    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-drawer').waitFor({ state: 'visible' })
    await shot(page, '05-ai-drawer')
    await page.getByTestId('ai-history').click()
    await page.getByTestId('ai-history-panel').waitFor({ state: 'visible' })
    await shot(page, '06-ai-history')
    // 历史项字号/色
    const histTitle = page.locator('.ai-drawer__hist-title').first()
    if (await histTitle.count()) {
      const fs_ = await histTitle.evaluate((el) => getComputedStyle(el).fontSize)
      const color = await histTitle.evaluate((el) => getComputedStyle(el).color)
      if (fs_ !== EXPECT.fontSm) {
        findings.push({ severity: 'warn', area: 'AiHistory', message: `历史标题字号 ${fs_} ≠ ${EXPECT.fontSm}` })
      }
      if (!near(color, EXPECT.text)) {
        findings.push({ severity: 'warn', area: 'AiHistory', message: `历史标题色 ${normColor(color)} ≠ ${EXPECT.text}` })
      }
    }
    await page.getByTestId('ai-drawer').getByRole('button', { name: '关闭' }).click()

    // —— 看板 ——
    await page.goto(`${BASE}/dashboards`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const dashCard = page.getByTestId('dashboard-card').first()
    if (await dashCard.isVisible().catch(() => false)) {
      await dashCard.click()
      await page.waitForTimeout(800)
    }
    await shot(page, '07-dashboard')

  /* 画布区检测：优先 canvas-wrap */
  const canvas = page.locator('.dash__canvas-wrap')
  if (await canvas.count()) {
    const canvasBg = await canvas.evaluate((el) => getComputedStyle(el).backgroundColor)
    if (!near(canvasBg, '#f9fafb') && !near(canvasBg, EXPECT.bg)) {
      findings.push({ severity: 'warn', area: 'Dashboard', message: `画布背景 ${normColor(canvasBg)} 宜 #f9fafb 或 --is-bg` })
    } else {
      findings.push({ severity: 'info', area: 'Dashboard', message: `画布背景 ${normColor(canvasBg)}` })
    }
  }

    // —— 弹窗一致性：新建分析 ——
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await shot(page, '08-modal-create')
    const dialogRadius = await page.getByRole('dialog').evaluate((el) => getComputedStyle(el).borderRadius)
    const primaryInModal = page.getByRole('dialog').getByRole('button', { name: 'Create' })
    if (await primaryInModal.count()) {
      const bg = await primaryInModal.evaluate((el) => getComputedStyle(el).backgroundColor)
      if (!near(bg, EXPECT.primary)) {
        findings.push({ severity: 'error', area: 'Modal', message: `弹窗主按钮 ${normColor(bg)} ≠ primary` })
      }
    }
    findings.push({ severity: 'info', area: 'Modal', message: `弹窗圆角 ${dialogRadius}` })
    await page.keyboard.press('Escape')

    // —— Token CSS 变量是否注入 ——
    const rootVars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        primary: s.getPropertyValue('--is-primary').trim(),
        accent: s.getPropertyValue('--is-accent').trim(),
        bg: s.getPropertyValue('--is-bg').trim(),
        surfaceMuted: s.getPropertyValue('--is-surface-muted').trim(),
        font: s.getPropertyValue('--is-font').trim().slice(0, 40),
      }
    })
    if (rootVars.primary !== EXPECT.primary) {
      findings.push({ severity: 'error', area: 'tokens', message: `--is-primary ${rootVars.primary}` })
    }
    if (!rootVars.surfaceMuted) {
      findings.push({
        severity: 'error',
        area: 'tokens',
        message: '--is-surface-muted 未定义，多处 var(--is-surface-muted, fallback) 实际靠 fallback，易漂移',
      })
    } else {
      findings.push({ severity: 'info', area: 'tokens', message: `--is-surface-muted=${rootVars.surfaceMuted}` })
    }
  } finally {
    await browser.close()
  }

  const errors = findings.filter((f) => f.severity === 'error')
  const warns = findings.filter((f) => f.severity === 'warn')
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    expect: EXPECT,
    findings,
    summary: { errors: errors.length, warns: warns.length, infos: findings.length - errors.length - warns.length },
    shots,
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  const md = [
    '# UI 一致性测试报告',
    '',
    `- 目标：\`${BASE}\``,
    `- 时间：${report.at}`,
    `- 汇总：**${errors.length} error / ${warns.length} warn / ${report.summary.infos} info**`,
    '',
    '## Findings',
    '',
    ...findings.map((f) => `- **[${f.severity}]** ${f.area}: ${f.message}`),
    '',
    '## 截图',
    '',
    ...shots.map((s) => `- \`${path.basename(s)}\``),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), md)
  console.log(md)
  if (errors.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
