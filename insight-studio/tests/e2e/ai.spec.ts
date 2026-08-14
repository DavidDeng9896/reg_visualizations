import { expect, test } from '@playwright/test'
import { createDemoAndEnter, openFlowchart, viewNode } from './helpers'

/**
 * AI 助手全链路 e2e：不依赖真实大模型。
 * insight-dsh 以 INSIGHT_DSH_MOCK=1 启动，按用户文案编排并真实执行平台工具
 *（8788 API + 独立 sqlite），验证「对话 → 计划 → 轨迹 → 产物 → 直达工作区」。
 */

async function mockAiConfig(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/ai/config', (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      json: {
        baseUrl: 'https://mock.local/v1',
        apiKeyMasked: 'm****y',
        configured: true,
        model: 'mock-qwen',
        models: ['mock-qwen-pro'],
        maxIterations: 100,
        confirmDestructive: true,
      },
    })
  })
}

test.describe('AI 助手（dsh mock 编排）', () => {
  test('对话驱动建图：进展打勾 → 轨迹卡 → 思考块 → 产物卡 → 点击直达工作区视图', async ({ page }) => {
    await mockAiConfig(page)

    await createDemoAndEnter(page)

    await page.getByTestId('ai-fab').click()
    await expect(page.getByTestId('ai-drawer')).toBeVisible()
    await page.getByTestId('ai-input').fill('把 Weight-length study 画成散点图并加线性拟合')
    await page.getByTestId('ai-send').click()

    const plan = page.getByTestId('ai-plan')
    await expect(plan).toBeVisible()
    await expect(plan.locator('.plan__step--done')).toHaveCount(3)

    await expect(page.getByTestId('ai-trace')).toContainText('已处理 7 个操作（完成 7）')

    const reasoning = page.getByTestId('ai-reasoning')
    await expect(reasoning).toContainText('思考过程')
    await reasoning.locator('.reason__head').click()
    await expect(reasoning).toContainText('用户要散点图与拟合')

    await expect(page.getByTestId('ai-messages')).toContainText('已完成')

    const pill = page.getByTestId('ai-model')
    await expect(pill).toContainText('mock-qwen')
    await pill.click()
    await page.locator('.bar__menu .bar__menu-item', { hasText: 'mock-qwen-pro' }).click()
    await expect(pill).toContainText('mock-qwen-pro')
    await pill.click()
    await page.locator('.bar__menu .bar__menu-item', { hasText: 'mock-qwen' }).first().click()
    await expect(pill).toContainText('mock-qwen')

    const artifact = page.getByTestId('ai-artifact').filter({ hasText: 'AI 散点分析' }).first()
    await expect(artifact).toBeVisible()
    const chartCard = artifact.getByTestId('ai-chart-card')
    await expect(chartCard).toBeVisible({ timeout: 15_000 })
    await chartCard.click()
    await expect(page).toHaveURL(/viewId=/)
    await expect(page.getByTestId('ai-drawer')).toBeHidden()

    await expect(viewNode(page, 'AI 散点分析')).toBeVisible()
  })

  test('危险操作确认流：delete_table → 确认按钮外露 → 确认后表真实删除', async ({ page }) => {
    await mockAiConfig(page)

    await createDemoAndEnter(page)
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toBeVisible()

    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-input').fill('删除 Iris measurements 表')
    await page.getByTestId('ai-send').click()

    const confirmBtn = page.getByTestId('ai-trace-confirm')
    await expect(confirmBtn).toBeVisible()
    const pending = page.getByTestId('ai-pending-actions')
    await expect(pending).toContainText('需要你的批准')
    await expect(pending).toContainText('删除表「Iris measurements」')
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toBeVisible()

    await confirmBtn.click()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toHaveCount(0)
    await expect(page.getByTestId('ai-messages')).toContainText('已按您的确认删除表', { timeout: 15_000 })
    await expect(page.getByTestId('ai-trace-confirm')).toHaveCount(0)
  })

  test('ask_user 选择卡：选项单选 → 提交后续轮；输入区显示上下文量与压缩入口', async ({ page }) => {
    await mockAiConfig(page)

    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()

    const ctx = page.getByTestId('ai-ctx')
    await expect(ctx).toBeVisible()
    await expect(ctx).toContainText('/128k')
    await ctx.click()
    await expect(page.getByTestId('ai-compress')).toBeDisabled()

    await page.getByTestId('ai-input').fill('帮我给当前表配一个散点图')
    await page.getByTestId('ai-send').click()

    const ask = page.getByTestId('ai-ask')
    await expect(ask).toBeVisible()
    await expect(ask).toContainText('需要你的回答')
    await expect(ask).toContainText('散点图按哪个字段着色分组？')
    await expect(ask.locator('.ask__opt')).toHaveCount(3)
    await expect(page.getByTestId('ai-ask-submit')).toBeDisabled()

    await ask.locator('.ask__opt', { hasText: '按 species 分组' }).click()
    await page.getByTestId('ai-ask-submit').click()
    await expect(page.getByTestId('ai-pending-actions')).toHaveCount(0)
    await expect(page.getByTestId('ai-messages')).toContainText('按 species 分组')
    await expect(page.getByTestId('ai-messages')).toContainText('收到，按你的选择继续配置图表')
  })

  test('对话驱动多节点管道：Filter/Join/派生列/报告/图/看板落到流程图', async ({ page }) => {
    test.setTimeout(120_000)
    await mockAiConfig(page)
    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-input').fill('把 hits 与 meta 做成过滤+Join 管道并出图放到看板')
    await page.getByTestId('ai-send').click()

    await expect(page.getByTestId('ai-plan').locator('.plan__step--done')).toHaveCount(4, { timeout: 60_000 })
    await expect(page.getByTestId('ai-messages')).toContainText('管道已完成')
    await expect(page.getByTestId('ai-artifact').filter({ hasText: '管道报告' })).toBeVisible()
    await expect(page.getByTestId('ai-artifact').filter({ hasText: '管道看板' })).toBeVisible()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'hits' })).toBeVisible()

    await page.getByTestId('ai-drawer').getByRole('button', { name: '关闭' }).click()
    await openFlowchart(page)
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Filter table/i })).toBeVisible()
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Join tables/i })).toBeVisible()
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Computed column/i })).toBeVisible()
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Hide columns/i })).toBeVisible()
    await expect(page.locator('.vue-flow__node').filter({ hasText: /管道报告/ })).toBeVisible()
    expect(await page.locator('.vue-flow__edge').count()).toBeGreaterThanOrEqual(4)
  })

  test('日配额失败结束 running，继续任务从检查点收尾', async ({ page }) => {
    await mockAiConfig(page)
    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-input').fill('先看表再收尾')
    await page.getByTestId('ai-send').click()

    await expect(page.getByTestId('ai-error')).toContainText('日配额', { timeout: 20_000 })
    await expect(page.getByTestId('ai-continue')).toBeVisible()
    await expect(page.getByTestId('ai-stop')).toHaveCount(0)

    await page.getByTestId('ai-continue').click()
    await expect(page.getByTestId('ai-messages')).toContainText('已从检查点续跑完成', { timeout: 20_000 })
    await expect(page.getByTestId('ai-continue')).toHaveCount(0)
  })

  test('中止后保留继续任务，点续跑能收尾', async ({ page }) => {
    await mockAiConfig(page)
    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-input').fill('看表再出图')
    await page.getByTestId('ai-send').click()

    await expect(page.getByTestId('ai-plan')).toBeVisible()
    await expect(page.getByTestId('ai-stop')).toBeVisible()
    await page.getByTestId('ai-stop').click()

    await expect(page.getByTestId('ai-error')).toContainText('已中止')
    await expect(page.getByTestId('ai-continue')).toBeVisible()

    await page.getByTestId('ai-continue').click()
    await expect(page.getByTestId('ai-messages')).toContainText('中止后续跑已完成', { timeout: 20_000 })
  })
})
