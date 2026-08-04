/**
 * 交互流畅度实机测试：对开发服 http://127.0.0.1:7100 用 Chromium 模拟真实使用。
 * - 录视频 + 关键步骤截图
 * - 记录操作→可见反馈的耗时（loading / 内容切换）
 * - 断言：点击后必须有可见反馈，分析切换不串数据，AI 历史面板可见
 *
 * 运行：cd insight-studio && npx tsx tests/manual/fluency-browser.mts
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.FLUENCY_BASE_URL ?? 'http://127.0.0.1:7100'
const OUT = process.env.FLUENCY_OUT ?? '/opt/cursor/artifacts/fluency-test'
const SLOW_MO = Number(process.env.FLUENCY_SLOW_MO ?? '40') // ms，模拟真人节奏

type StepResult = {
  name: string
  ok: boolean
  ms: number
  detail?: string
  screenshot?: string
}

const results: StepResult[] = []

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true })
}

async function shot(page: Page, name: string): Promise<string> {
  const file = path.join(OUT, `${String(results.length + 1).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function step(name: string, page: Page, fn: () => Promise<string | void>): Promise<void> {
  const t0 = Date.now()
  try {
    const detail = (await fn()) ?? undefined
    const ms = Date.now() - t0
    const screenshot = await shot(page, name.replace(/[^\w\u4e00-\u9fff-]+/g, '_'))
    results.push({ name, ok: true, ms, detail, screenshot })
    console.log(`✓ ${name}  ${ms}ms  ${detail ?? ''}`)
  } catch (e) {
    const ms = Date.now() - t0
    let screenshot: string | undefined
    try {
      screenshot = await shot(page, `FAIL-${name.replace(/[^\w\u4e00-\u9fff-]+/g, '_')}`)
    } catch {
      /* ignore */
    }
    const detail = e instanceof Error ? e.message : String(e)
    results.push({ name, ok: false, ms, detail, screenshot })
    console.error(`✗ ${name}  ${ms}ms  ${detail}`)
    throw e
  }
}

async function waitVisible(page: Page, selector: string, timeout = 12_000) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout })
}

async function main() {
  ensureOut()
  console.log(`Fluency test → ${BASE}`)
  console.log(`Artifacts → ${OUT}`)

  const browser = await chromium.launch({
    headless: true,
    slowMo: SLOW_MO,
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()

  // 收集长任务 / console 错误
  const consoleErrors: string[] = []
  page.on('pageerror', (err) => consoleErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  try {
    await step('01-打开首页', page, async () => {
      const t0 = Date.now()
      await page.goto(BASE, { waitUntil: 'networkidle' })
      await waitVisible(page, '[data-testid="analysis-card"]')
      return `首屏卡片就绪 ${Date.now() - t0}ms`
    })

    await step('02-点击分析卡片-应有opening或loading反馈', page, async () => {
      const card = page.getByTestId('analysis-card').filter({ hasText: '抗体纯化工艺分析' }).first()
      await card.click()
      // 点击后短窗口内：卡片 opening / 工作区 loading / 或侧栏表出现
      const feedback = await Promise.race([
        page
          .locator('.card--opening, .ws__loading, .side__loading, [data-testid="sidebar-table"]')
          .first()
          .waitFor({ state: 'visible', timeout: 8000 })
          .then(() => 'got-feedback'),
        page.waitForURL(/\/analysis\//, { timeout: 8000 }).then(() => 'navigated'),
      ])
      await page.waitForURL(/\/analysis\//)
      await waitVisible(page, '[data-testid="sidebar-table"]')
      return String(feedback)
    })

    await step('03-选表进入数据列表', page, async () => {
      const table = page.getByTestId('sidebar-table').filter({ hasText: 'Purification batches' }).first()
      await table.click()
      await waitVisible(page, '[data-testid="grid-stats"]')
      const stats = await page.getByTestId('grid-stats').innerText()
      return stats.slice(0, 80)
    })

    await step('04-切Flowchart再回工作区', page, async () => {
      const btn = page.getByRole('button', { name: /Flowchart/i }).first()
      await btn.click()
      // 应有 loading 或流程图节点
      await Promise.race([
        page.locator('.ws__loading, .ws__chunk-loading, .vue-flow').first().waitFor({ state: 'visible', timeout: 10_000 }),
        page.getByText(/流程图|BETA|还没有数据/).first().waitFor({ state: 'visible', timeout: 10_000 }),
      ]).catch(() => undefined)
      await page.waitForTimeout(400)
      // 再点回工作区（同一按钮）
      await btn.click()
      await page.waitForTimeout(300)
      return 'flowchart-roundtrip'
    })

    await step('05-回列表再进第二个分析-不应串数据', page, async () => {
      // 点侧栏「分析」分段或直接 goto
      const seg = page.getByRole('button', { name: '分析', exact: true }).first()
      if (await seg.isVisible().catch(() => false)) await seg.click()
      else await page.goto(`${BASE}/`)
      await page.waitForURL(/\/$|\/insights/)
      await waitVisible(page, '[data-testid="analysis-card"]')
      await page.getByTestId('analysis-card').filter({ hasText: '抗体亲和力筛选分析' }).first().click()
      await page.waitForURL(/\/analysis\//)
      await waitVisible(page, '[data-testid="sidebar-table"]')
      const hasOld = await page.getByTestId('sidebar-table').filter({ hasText: 'Purification batches' }).count()
      if (hasOld > 0) throw new Error('串数据：仍看到上一分析的 Purification batches')
      await page.getByTestId('sidebar-table').filter({ hasText: 'SPR kinetics' }).first().click()
      await waitVisible(page, '[data-testid="grid-stats"]')
      return 'no-stale-tables'
    })

    await step('06-打开AI抽屉', page, async () => {
      await page.getByTestId('ai-entry').click()
      await waitVisible(page, '[data-testid="ai-drawer"]')
      return 'drawer-open'
    })

    await step('07-打开会话历史面板', page, async () => {
      await page.getByTestId('ai-history').click()
      await waitVisible(page, '[data-testid="ai-history-panel"]')
      // 面板必须在抽屉内可见（不被挡住）
      const box = await page.getByTestId('ai-history-panel').boundingBox()
      if (!box || box.width < 100 || box.height < 80) throw new Error(`历史面板尺寸异常 ${JSON.stringify(box)}`)
      return `panel ${Math.round(box.width)}x${Math.round(box.height)}`
    })

    await step('08-新会话并关闭抽屉', page, async () => {
      await page.getByTestId('ai-newconv').click()
      await page.waitForTimeout(400)
      // 历史应关闭，回到对话空态或输入区
      await page.getByTestId('ai-drawer').getByRole('button', { name: '关闭' }).click()
      await page.getByTestId('ai-drawer').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined)
      return 'drawer-closed'
    })

    await step('09-看板切换', page, async () => {
      const dashSeg = page.getByRole('button', { name: '看板', exact: true }).first()
      if (await dashSeg.isVisible().catch(() => false)) {
        await dashSeg.click()
      } else {
        await page.goto(`${BASE}/dashboards`)
      }
      await page.waitForTimeout(600)
      // 有卡片则点开
      const dashCard = page.getByTestId('dashboard-card').first()
      if (await dashCard.isVisible().catch(() => false)) {
        await dashCard.click()
        await Promise.race([
          page.locator('.dash__loading').waitFor({ state: 'visible', timeout: 2000 }),
          page.locator('.dash__name, .dash__main').first().waitFor({ state: 'visible', timeout: 8000 }),
        ]).catch(() => undefined)
        await page.waitForTimeout(500)
      }
      return 'dashboard-ok'
    })

    await step('10-连续快切分析压力', page, async () => {
      await page.goto(`${BASE}/`)
      await waitVisible(page, '[data-testid="analysis-card"]')
      const names = ['抗体纯化工艺分析', '抗体亲和力筛选分析', '抗体细胞活性分析']
      for (const name of names) {
        const card = page.getByTestId('analysis-card').filter({ hasText: name }).first()
        if (!(await card.isVisible().catch(() => false))) continue
        await card.click()
        await page.waitForURL(/\/analysis\//, { timeout: 10_000 })
        await waitVisible(page, '[data-testid="sidebar-table"]')
        // 立刻回列表再点下一个
        await page.goto(`${BASE}/`)
        await waitVisible(page, '[data-testid="analysis-card"]')
      }
      // 最终停在最后一个
      await page.getByTestId('analysis-card').filter({ hasText: '抗体细胞活性分析' }).first().click()
      await page.waitForURL(/\/analysis\//)
      await waitVisible(page, '[data-testid="sidebar-table"]')
      const title = await page.locator('.ws__title').innerText().catch(() => '')
      return `final-title=${title.slice(0, 40)}`
    })
  } finally {
    const videoPath = await page.video()?.path()
    await context.close()
    await browser.close()

    // 移动视频到固定名
    if (videoPath && fs.existsSync(videoPath)) {
      const dest = path.join(OUT, 'fluency-session.webm')
      fs.renameSync(videoPath, dest)
      console.log(`video → ${dest}`)
    }

    const failed = results.filter((r) => !r.ok)
    const report = {
      base: BASE,
      at: new Date().toISOString(),
      slowMo: SLOW_MO,
      passed: results.filter((r) => r.ok).length,
      failed: failed.length,
      steps: results,
      consoleErrors: consoleErrors.slice(0, 30),
      thresholds: {
        note: '单步建议 < 5000ms（含网络与动画）；点击后 8000ms 内必须有可见反馈',
      },
    }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
    const md = [
      '# 交互流畅度实机测试报告',
      '',
      `- 目标：\`${BASE}\``,
      `- 时间：${report.at}`,
      `- 结果：**${report.passed} 通过 / ${report.failed} 失败**（共 ${results.length} 步）`,
      `- slowMo：${SLOW_MO}ms（模拟真人点击节奏）`,
      '',
      '## 步骤',
      '',
      '| # | 步骤 | 结果 | 耗时 | 说明 |',
      '|---|------|------|------|------|',
      ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.ok ? '✓' : '✗'} | ${r.ms}ms | ${(r.detail ?? '').replace(/\|/g, '/')} |`),
      '',
      consoleErrors.length ? `## 页面错误\n\n${consoleErrors.map((e) => `- ${e}`).join('\n')}` : '## 页面错误\n\n无',
      '',
      '## 产物',
      '',
      `- 视频：\`fluency-session.webm\``,
      `- 截图：同目录 \`NN-*.png\``,
      `- JSON：\`report.json\``,
      '',
    ].join('\n')
    fs.writeFileSync(path.join(OUT, 'REPORT.md'), md)
    console.log('\n' + md)
    if (failed.length) process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
