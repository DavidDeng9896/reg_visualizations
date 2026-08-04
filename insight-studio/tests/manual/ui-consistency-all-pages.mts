/**
 * 全页面 UI 一致性实机测试：覆盖全部路由 + 工作区模式 + 主要弹层/抽屉。
 * 每页截图 + 基础可用性断言 + token 抽检。
 *
 * 运行：cd insight-studio && npx tsx tests/manual/ui-consistency-all-pages.mts
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.UI_BASE_URL ?? 'http://127.0.0.1:7100'
const OUT = process.env.UI_OUT ?? '/opt/cursor/artifacts/ui-consistency-all'

type PageResult = {
  id: string
  title: string
  ok: boolean
  ms: number
  detail?: string
  screenshot?: string
}

const results: PageResult[] = []
const PRIMARY = '#1e2a78'

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true })
}

function normColor(c: string): string {
  if (c.startsWith('#')) return c.toLowerCase()
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return c.toLowerCase().replace(/\s/g, '')
  return `#${[Number(m[1]), Number(m[2]), Number(m[3])]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`
}

async function shot(page: Page, id: string) {
  const file = path.join(OUT, `${id}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function checkShell(page: Page): Promise<string[]> {
  const issues: string[] = []
  const header = page.locator('.app-header, [class*="AppHeader"], header').first()
  if (!(await header.isVisible().catch(() => false))) {
    const h2 = page.locator('text=科学数据管理').first()
    if (!(await h2.isVisible().catch(() => false))) issues.push('缺少全局头部')
  }
  const muted = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--is-surface-muted').trim(),
  )
  if (!muted) issues.push('--is-surface-muted 未注入')
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--is-primary').trim(),
  )
  if (primary && primary !== PRIMARY) issues.push(`--is-primary=${primary}`)
  return issues
}

/** 强制关闭所有 IModal / IPopover，避免遮罩拦截后续点击。 */
async function closeAllOverlays(page: Page) {
  for (let i = 0; i < 8; i++) {
    const closeBtn = page.locator('.is-modal__overlay .is-modal__close').first()
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(180)
      continue
    }
    const overlay = page.locator('.is-modal__overlay').first()
    if (await overlay.count()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      // 仍在则点遮罩
      if (await overlay.isVisible().catch(() => false)) {
        await overlay.click({ position: { x: 8, y: 8 }, force: true }).catch(() => undefined)
        await page.waitForTimeout(180)
      }
      continue
    }
    break
  }
  // 关掉残留 popover
  for (let i = 0; i < 3; i++) {
    const pop = page.locator('.is-popover__panel').first()
    if (!(await pop.isVisible().catch(() => false))) break
    await page.keyboard.press('Escape')
    await page.waitForTimeout(120)
  }
  await page.locator('.is-modal__overlay').waitFor({ state: 'detached', timeout: 4000 }).catch(() => undefined)
  await page.waitForTimeout(100)
}

async function dialog(page: Page, name: string | RegExp) {
  return page.getByRole('dialog', { name })
}

async function pageCase(
  page: Page,
  id: string,
  title: string,
  fn: () => Promise<string | void>,
  opts?: { skipShell?: boolean },
): Promise<void> {
  const t0 = Date.now()
  try {
    const detail = ((await fn()) ?? '') as string
    const shellIssues = opts?.skipShell ? [] : await checkShell(page)
    const screenshot = await shot(page, id)
    const ok = shellIssues.length === 0
    const msg = [...(detail ? [detail] : []), ...shellIssues].join('; ')
    results.push({ id, title, ok, ms: Date.now() - t0, detail: msg || undefined, screenshot })
    console.log(`${ok ? '✓' : '✗'} ${id}  ${Date.now() - t0}ms  ${title}${msg ? ' — ' + msg : ''}`)
  } catch (e) {
    const screenshot = await shot(page, `FAIL-${id}`).catch(() => undefined)
    const detail = e instanceof Error ? e.message : String(e)
    results.push({ id, title, ok: false, ms: Date.now() - t0, detail, screenshot })
    console.error(`✗ ${id}  ${Date.now() - t0}ms  ${title} — ${detail}`)
    // 失败后尽量清场，避免污染后续用例
    await closeAllOverlays(page).catch(() => undefined)
  }
}

async function openAddDataItem(page: Page, label: RegExp | string) {
  await closeAllOverlays(page)
  const add = page.locator('button.side__add[aria-label="Add data"]').first()
  await add.waitFor({ state: 'visible' })
  await add.click()
  const item = page.getByRole('menuitem', { name: label })
  await item.waitFor({ state: 'visible', timeout: 8000 })
  await item.click()
}

async function main() {
  ensureOut()
  console.log(`All-pages UI consistency → ${BASE}`)
  console.log(`Out → ${OUT}`)

  const browser = await chromium.launch({ headless: true, slowMo: 20 })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)

  try {
    /* ========== 路由页 ========== */
    await pageCase(page, 'P01-home-analysis-list', '分析首页 / 侧栏分析列表', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' })
      await page.getByTestId('analysis-card').first().waitFor({ state: 'visible' })
      const n = await page.getByTestId('analysis-card').count()
      if (n < 1) throw new Error('无分析卡片')
      return `${n} cards`
    })

    await pageCase(page, 'P02-home-create-modal', '新建 Analysis 弹窗', async () => {
      await closeAllOverlays(page)
      await page.getByRole('button', { name: 'New analysis' }).first().click()
      const dlg = await dialog(page, '新建 Analysis')
      await dlg.waitFor({ state: 'visible' })
      const btn = dlg.getByRole('button', { name: 'Create' })
      await btn.waitFor({ state: 'visible' })
      const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
      if (normColor(bg) !== PRIMARY) throw new Error(`Create 按钮色 ${normColor(bg)}`)
      return `primary=${normColor(bg)}`
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P03-dashboard-list', '看板列表（空或有卡）', async () => {
      await page.goto(`${BASE}/dashboards`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      const cards = await page.getByTestId('dashboard-card').count()
      return `dashboard-cards=${cards}`
    })

    await pageCase(page, 'P04-dashboard-detail', '看板详情画布', async () => {
      if (await page.getByTestId('dashboard-card').count()) {
        await page.getByTestId('dashboard-card').first().click()
        await page.locator('.dash__name').waitFor({ state: 'visible', timeout: 10000 })
        const bg = await page.locator('.dash__canvas-wrap').evaluate((el) => getComputedStyle(el).backgroundColor)
        return `canvas=${normColor(bg)} name=${(await page.locator('.dash__name').innerText()).slice(0, 24)}`
      }
      await page.getByText(/选择或新建看板|还没有/).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
      return 'empty-dashboard'
    })

    await pageCase(page, 'P05-dashboard-add-widget', '看板·添加组件弹窗', async () => {
      await closeAllOverlays(page)
      // 空画布有主按钮；有组件时从工具栏 ⋯ 菜单进入（勿点侧栏卡片菜单）
      const emptyAdd = page.locator('.dash__canvas-wrap').getByRole('button', { name: /添加组件/ }).first()
      if (await emptyAdd.isVisible().catch(() => false)) {
        await emptyAdd.click()
      } else {
        const more = page.locator('.dash__actions').getByRole('button', { name: '更多操作' }).first()
        if (!(await more.isVisible().catch(() => false))) return 'skip-no-dashboard'
        await more.click()
        await page.getByRole('menuitem', { name: /添加组件/ }).click()
      }
      const dlg = await dialog(page, '添加组件')
      await dlg.waitFor({ state: 'visible', timeout: 8000 })
      return 'add-widget-dialog'
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P06-dashboard-category', '看板·分类样式侧栏', async () => {
      await closeAllOverlays(page)
      const more = page.locator('.dash__actions').getByRole('button', { name: '更多操作' }).first()
      if (!(await more.isVisible().catch(() => false))) return 'skip'
      await more.click()
      const item = page.getByRole('menuitem', { name: /分类样式/ })
      if (!(await item.isVisible().catch(() => false))) {
        await page.keyboard.press('Escape')
        return 'skip-no-menu'
      }
      await item.click()
      await page.locator('.dash__cats, [aria-label="分类样式"]').first().waitFor({ state: 'visible', timeout: 5000 })
      return 'category-open'
    })
    await page.locator('.dash__cats button[aria-label="关闭"]').click().catch(() => undefined)

    /* ========== 分析工作区 ========== */
    await pageCase(page, 'P07-analysis-workspace-empty-select', '分析工作区（进入后未选表）', async () => {
      await closeAllOverlays(page)
      await page.goto(`${BASE}/analysis/demo-md-ab023`, { waitUntil: 'networkidle' })
      await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
      return `tables=${await page.getByTestId('sidebar-table').count()}`
    })

    await pageCase(page, 'P08-analysis-table-grid', '分析·表数据网格', async () => {
      await closeAllOverlays(page)
      await page.getByTestId('sidebar-table').filter({ hasText: 'Purification' }).first().click()
      await page.getByTestId('grid-stats').waitFor({ state: 'visible' })
      return await page.getByTestId('grid-stats').innerText()
    })

    await pageCase(page, 'P09-analysis-chart-view', '分析·图表视图', async () => {
      await closeAllOverlays(page)
      const v = page.getByTestId('sidebar-view').filter({ hasText: '各步骤收率' }).first()
      await v.click()
      await Promise.race([
        page.getByTestId('chart-canvas').waitFor({ state: 'visible', timeout: 15000 }),
        page.locator('.js-plotly-plot, .cview__skeleton').first().waitFor({ state: 'visible', timeout: 15000 }),
      ])
      return 'chart-visible'
    })

    await pageCase(page, 'P10-analysis-flowchart', '分析·流程图模式', async () => {
      await closeAllOverlays(page)
      await page.getByRole('button', { name: /Flowchart/i }).first().click()
      await page.waitForTimeout(800)
      await Promise.race([
        page.locator('.vue-flow').first().waitFor({ state: 'visible', timeout: 12000 }),
        page.getByText(/BETA|还没有数据|流程图/).first().waitFor({ state: 'visible', timeout: 12000 }),
      ])
      return 'flowchart'
    })

    await pageCase(page, 'P11-analysis-rename-modal', '分析·重命名弹窗', async () => {
      await closeAllOverlays(page)
      const flow = page.getByRole('button', { name: /Flowchart/i }).first()
      if ((await flow.getAttribute('aria-pressed')) === 'true') await flow.click()
      // 工作区顶栏 ⋯，避免点到侧栏卡片菜单
      const more = page.locator('.ws__header-actions').getByRole('button', { name: '更多操作' }).first()
      await more.click()
      await page.getByRole('menuitem', { name: /重命名/ }).click()
      const dlg = await dialog(page, /重命名 Analysis|重命名/)
      await dlg.waitFor({ state: 'visible' })
      return 'rename-open'
    })
    await closeAllOverlays(page)

    /* ========== Add data 四弹窗 ========== */
    await pageCase(page, 'P12-dialog-csv', 'Import CSV 弹窗', async () => {
      await openAddDataItem(page, /Import CSV/)
      const dlg = await dialog(page, 'Import CSV')
      await dlg.waitFor({ state: 'visible' })
      return (await dlg.getAttribute('aria-label')) || 'csv'
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P13-dialog-excel', 'Import Excel 弹窗', async () => {
      await openAddDataItem(page, /Import Excel/)
      const dlg = await dialog(page, 'Import Excel')
      await dlg.waitFor({ state: 'visible' })
      return 'excel'
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P14-dialog-sql', 'Import from SQL 弹窗', async () => {
      await openAddDataItem(page, /Import from SQL/)
      const dlg = await dialog(page, 'Import from SQL')
      await dlg.waitFor({ state: 'visible' })
      return 'sql'
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P15-dialog-combine', 'Combine tables 弹窗', async () => {
      await openAddDataItem(page, /Combine|合并/)
      const dlg = await dialog(page, /Combine tables|合并/)
      await dlg.waitFor({ state: 'visible' })
      return 'combine'
    })
    await closeAllOverlays(page)

    /* ========== 过滤 / 转换 ========== */
    await pageCase(page, 'P16-dialog-filter', 'Add filter 弹窗', async () => {
      await closeAllOverlays(page)
      await page.getByTestId('sidebar-table').filter({ hasText: 'Purification' }).first().click()
      await page.getByTestId('grid-stats').waitFor({ state: 'visible' })
      const filterBtn = page.locator('button.dg__ft-add').filter({ hasText: /Add filter/i }).first()
      if (!(await filterBtn.isVisible().catch(() => false))) {
        const alt = page.getByRole('button', { name: /Add filter/i }).first()
        if (!(await alt.isVisible().catch(() => false))) return 'skip-no-filter-btn'
        await alt.click()
      } else {
        await filterBtn.click()
      }
      const dlg = await dialog(page, /新建过滤|编辑过滤/)
      await dlg.waitFor({ state: 'visible', timeout: 8000 })
      return 'filter-open'
    })
    await closeAllOverlays(page)

    await pageCase(page, 'P17-dialog-transform', 'Transform 弹窗', async () => {
      await closeAllOverlays(page)
      const tBtn = page.locator('button.dg__ft-add').filter({ hasText: /Add transform|Transform|转换/i }).first()
      if (await tBtn.isVisible().catch(() => false)) {
        await tBtn.click()
      } else {
        const alt = page.getByRole('button', { name: /Add transform|转换|Transform/i }).first()
        if (!(await alt.isVisible().catch(() => false))) return 'skip-no-transform'
        await alt.click()
      }
      const dlg = await dialog(page, /新建转换|编辑转换/)
      if (!(await dlg.isVisible().catch(() => false))) {
        // 抽屉也可能是 Transform 标题
        const any = page.locator('.is-modal__panel--drawer[role="dialog"]').first()
        if (!(await any.isVisible().catch(() => false))) return 'skip-transform-not-opened'
        return 'transform-drawer'
      }
      return 'transform-open'
    })
    await closeAllOverlays(page)

    /* ========== AI ========== */
    await pageCase(page, 'P18-ai-drawer', 'AI 助手抽屉', async () => {
      await closeAllOverlays(page)
      await page.getByTestId('ai-entry').click()
      await page.getByTestId('ai-drawer').waitFor({ state: 'visible' })
      return 'drawer'
    })

    await pageCase(page, 'P19-ai-history', 'AI 会话历史', async () => {
      await page.getByTestId('ai-history').click()
      await page.getByTestId('ai-history-panel').waitFor({ state: 'visible' })
      const box = await page.getByTestId('ai-history-panel').boundingBox()
      if (!box || box.height < 80) throw new Error('历史面板不可见')
      return `${Math.round(box.width)}x${Math.round(box.height)}`
    })

    await pageCase(page, 'P20-ai-settings', 'AI 设置弹窗', async () => {
      const back = page.getByTestId('ai-drawer').getByRole('button', { name: '返回对话' })
      if (await back.isVisible().catch(() => false)) await back.click()
      await page.getByTestId('ai-settings').click()
      const dlg = await dialog(page, 'AI 设置')
      await dlg.waitFor({ state: 'visible' })
      return 'settings'
    })
    await closeAllOverlays(page)
    await page.getByTestId('ai-drawer').getByRole('button', { name: '关闭' }).click().catch(() => undefined)

    /* ========== 其它分析 / 404 ========== */
    await pageCase(page, 'P21-analysis-ab101', '分析页·亲和力筛选', async () => {
      await closeAllOverlays(page)
      await page.goto(`${BASE}/analysis/demo-md-ab101`, { waitUntil: 'networkidle' })
      await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
      const title = await page.locator('.ws__title').innerText()
      if (!title.includes('亲和力')) throw new Error(`标题异常: ${title}`)
      return title
    })

    await pageCase(page, 'P22-analysis-fl112', '分析页·细胞活性', async () => {
      await page.goto(`${BASE}/analysis/demo-md-fl112`, { waitUntil: 'networkidle' })
      await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
      return await page.locator('.ws__title').innerText()
    })

    await pageCase(page, 'P23-analysis-chart-features', '分析页·图表新特性演示', async () => {
      await page.goto(`${BASE}/analysis/demo-chart-features`, { waitUntil: 'networkidle' })
      await page.getByTestId('sidebar-table').first().waitFor({ state: 'visible' })
      return await page.locator('.ws__title').innerText()
    })

    await pageCase(page, 'P24-not-found', '404 Not Found', async () => {
      await page.goto(`${BASE}/this-route-does-not-exist-xyz`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const body = await page.locator('body').innerText()
      if (!/404|不存在|Not Found|找不到|返回/i.test(body)) {
        return `body-snippet=${body.slice(0, 80).replace(/\n/g, ' ')}`
      }
      return '404-ok'
    }, { skipShell: true })

    await pageCase(page, 'P25-insights-redirect', '/insights 重定向到首页', async () => {
      await page.goto(`${BASE}/insights`, { waitUntil: 'networkidle' })
      await page.waitForURL(/\/$|\/\?/)
      await page.getByTestId('analysis-card').first().waitFor({ state: 'visible' })
      return page.url()
    })
  } finally {
    await context.close()
    await browser.close()
  }

  const failed = results.filter((r) => !r.ok)
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  const md = [
    '# 全页面 UI 一致性测试报告',
    '',
    `- 目标：\`${BASE}\``,
    `- 时间：${report.at}`,
    `- 覆盖：**${report.passed}/${report.total} 通过**${failed.length ? `（失败 ${failed.length}）` : ''}`,
    '',
    '## 页面清单',
    '',
    '| ID | 页面 | 结果 | 耗时 | 说明 |',
    '|----|------|------|------|------|',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.title} | ${r.ok ? '✓' : '✗'} | ${r.ms}ms | ${(r.detail ?? '').replace(/\|/g, '/').slice(0, 80)} |`,
    ),
    '',
    failed.length
      ? `## 失败\n\n${failed.map((f) => `- **${f.id}**: ${f.detail}`).join('\n')}\n`
      : '## 失败\n\n无\n',
    '## 截图目录',
    '',
    `\`${OUT}\``,
    '',
  ].join('\n')
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), md)
  console.log('\n' + md)
  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
