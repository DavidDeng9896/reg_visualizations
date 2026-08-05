/**
 * 真实模型科学家场景 E2E（Vite :7100 + Go :8787，AI 已配置）。
 * npx playwright test --config=playwright.scientist-e2e.config.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { createScientistAnalysis } from '../../src/shared/scientistSeed'

async function openAi(page: Page): Promise<void> {
  await page.getByTestId('ai-fab').click()
  await expect(page.getByTestId('ai-drawer')).toBeVisible()
}

async function newConv(page: Page): Promise<void> {
  await page.getByTestId('ai-newconv').click()
  await expect(page.getByTestId('ai-input')).toBeVisible()
}

async function runPrompt(page: Page, prompt: string): Promise<string> {
  await page.getByTestId('ai-input').fill(prompt)
  await page.getByTestId('ai-send').click()
  await expect(page.getByTestId('ai-stop')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ai-stop')).toHaveCount(0, { timeout: 420_000 })
  // expand last trace if present
  const trace = page.getByTestId('ai-trace').last()
  if (await trace.count()) {
    const head = trace.locator('.trace__head')
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
  }
  return page.getByTestId('ai-drawer').innerText()
}

function expectTools(body: string, names: string[]): void {
  for (const n of names) {
    expect(body, `expected tool ${n} in UI`).toMatch(new RegExp(n, 'i'))
  }
}

test.describe.configure({ mode: 'serial', timeout: 480_000 })

test.describe('科学家场景 · 真实 deepseek', () => {
  let analysisId = ''

  test.beforeAll(async ({ request }) => {
    const cfg = await (await request.get('/api/ai/config')).json()
    expect(cfg.configured).toBeTruthy()
    expect(String(cfg.model)).toContain('deepseek')

    const skills = (await (await request.get('/api/ai/skills')).json()) as Array<{ id: string }>
    const ids = skills.map((s) => s.id)
    for (const id of [
      'antibody-discovery',
      'cell-line-development',
      'in-vitro-bioassay',
      'in-vivo-efficacy',
      'lab-data-workflow',
      'chart-best-practices',
    ]) {
      expect(ids).toContain(id)
    }

    const demo = createScientistAnalysis()
    analysisId = demo.id
    const put = await request.put(`/api/analyses/${encodeURIComponent(demo.id)}`, { data: demo })
    expect(put.ok()).toBeTruthy()
  })

  test('官方 Skills 全部出现在能力面板', async ({ page }) => {
    await page.goto(`/analysis/${analysisId}`)
    await expect(page.getByTestId('sidebar-table').first()).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '能力' }).click()
    const dialog = page.getByRole('dialog', { name: '能力' })
    for (const name of [
      'Antibody discovery analysis',
      'Cell line development',
      'In vitro bioassay',
      'In vivo efficacy & tolerability',
      'Lab data workflow',
      'Chart best practices',
    ]) {
      await expect(dialog.getByText(name, { exact: true })).toBeVisible()
    }
    await page.keyboard.press('Escape')
  })

  test('抗体发现全链路', async ({ page }) => {
    await page.goto(`/analysis/${analysisId}`)
    await expect(page.getByTestId('sidebar-table').first()).toBeVisible({ timeout: 20_000 })
    await openAi(page)
    await newConv(page)
    const body = await runPrompt(
      page,
      [
        '你是抗体发现数据分析助手。必须先 submit_plan，再：',
        '1) list_skills',
        '2) read_skill skillId=antibody-discovery',
        '3) read_skill skillId=lab-data-workflow',
        '4) list_tables 与 get_table_schema 查看 ELISA binding screen、SPR kinetics',
        '5) 为 ELISA 创建 bar 图（x=clone_id, y/聚合 od450），并为 SPR 创建 scatter（x=KD_nM）',
        '6) 用真实表数据推荐 Top 候选 clone（结合 OD 与 KD），中文总结',
        '禁止编造表中不存在的数值。',
      ].join('\n'),
    )
    expectTools(body, ['list_skills', 'read_skill', 'list_tables'])
    expect(body).toMatch(/antibody-discovery|mAb-|KD|ELISA|SPR|候选/i)
    expect(await page.getByTestId('ai-artifact').count()).toBeGreaterThan(0)
  })

  test('细胞构建滴度', async ({ page }) => {
    await page.goto(`/analysis/${analysisId}`)
    await openAi(page)
    await newConv(page)
    const body = await runPrompt(
      page,
      [
        '细胞株构建场景：submit_plan 后 read_skill skillId=cell-line-development，',
        '分析 CHO fed-batch titer：创建 line 图 x=day values=titer_mg_L series=clone_id，',
        '并结合 viability 推荐 Top 表达克隆。用工具，勿编造。',
      ].join('\n'),
    )
    expect(body).toMatch(/cell-line-development|read_skill|titer|clone|滴度|活率/i)
  })

  test('体外 ADCC 剂量反应', async ({ page }) => {
    await page.goto(`/analysis/${analysisId}`)
    await openAi(page)
    await newConv(page)
    const body = await runPrompt(
      page,
      [
        '体外试验：read_skill skillId=in-vitro-bioassay，分析 ADCC dose-response。',
        '创建 scatter：x=concentration values=response series=sample；若支持设 regression 4PL。',
        '比较 mAb-A01、mAb-B03 相对 Isotype control 的效价方向。',
      ].join('\n'),
    )
    expect(body).toMatch(/in-vitro-bioassay|ADCC|dose|mAb-A01|效价|4PL|concentration/i)
  })

  test('体内 PDX 药效与耐受', async ({ page }) => {
    await page.goto(`/analysis/${analysisId}`)
    await openAi(page)
    await newConv(page)
    const body = await runPrompt(
      page,
      [
        '体内试验：read_skill skillId=in-vivo-efficacy，分析 PDX tumor & body weight。',
        '创建 line：x=day values=tumor_mm3 series=group；再评估体重耐受。',
        '总结 Vehicle / mAb-A01 10mpk / mAb-B03 10mpk。',
      ].join('\n'),
    )
    expect(body).toMatch(/in-vivo-efficacy|tumor|瘤|体重|Vehicle|mAb-A01/i)
  })
})
