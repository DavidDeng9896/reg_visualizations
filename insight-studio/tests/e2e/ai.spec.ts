import { expect, test } from '@playwright/test'
import { createDemoAndEnter, viewNode } from './helpers'

/**
 * AI 助手全链路 e2e：不依赖真实大模型——
 * - 拦截 GET /api/ai/config → 直接返回「已配置」
 * - 拦截 POST /api/ai/chat → 按 tool 消息轮次回放编排好的 SSE（与 scripts/mock-ai.mjs 同思路）
 * 工具真实作用于 e2e 环境（8788 API + 独立 sqlite），验证「对话 → 计划 → 轨迹 → 产物 → 直达工作区」。
 */

interface Msg {
  role: string
  content?: string
  name?: string
}

function chunk(delta: Record<string, unknown>, finish: string | null = null): string {
  return `data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`
}

let callSeq = 0
function toolCall(name: string, args: Record<string, unknown>): Record<string, unknown> {
  callSeq += 1
  return { index: 0, id: `call_${name}_${callSeq}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

function sseOf(payload: { toolCalls?: Record<string, unknown>[]; content?: string; reasoning?: string }): string {
  let body = ''
  if (payload.toolCalls) {
    body += chunk({ role: 'assistant', tool_calls: payload.toolCalls })
    body += chunk({}, 'stop')
  } else {
    if (payload.reasoning) body += chunk({ role: 'assistant', reasoning_content: payload.reasoning })
    const parts = String(payload.content ?? '')
      .split(/(?<=。|：|\n)/)
      .filter(Boolean)
    for (const part of parts) body += chunk({ role: 'assistant', content: part })
    body += chunk({}, 'stop')
  }
  return `${body}data: [DONE]\n\n`
}

/** 从工具结果消息中提取指定表的 id（list_tables 摘要行格式：- 名称（id: xxx，…））。 */
function extractTableId(messages: Msg[], tableName: string): string {
  const re = new RegExp(`${tableName}（id: ([0-9a-f-]{8,})`)
  for (const m of messages) {
    const hit = typeof m.content === 'string' ? m.content.match(re) : null
    if (hit) return hit[1]
  }
  throw new Error(`mock 未找到表 id：${tableName}`)
}

function extractViewId(messages: Msg[]): string {
  for (const m of messages) {
    const hit = typeof m.content === 'string' ? m.content.match(/view id: ([0-9a-f-]+)/i) : null
    if (hit) return hit[1]
  }
  throw new Error('mock 未找到 view id')
}

/** 编排：submit_plan → list_tables → create_view → set_chart_config → mark_step_done×3 → 总结。 */
function mockSse(messages: Msg[]): string {
  const round = messages.filter((m) => m.role === 'tool').length + 1
  switch (round) {
    case 1:
      return sseOf({ toolCalls: [toolCall('submit_plan', { steps: ['查看当前表结构', '创建散点视图并配置映射', '加线性拟合与拟合注释'] })] })
    case 2:
      return sseOf({ toolCalls: [toolCall('list_tables', {})] })
    case 3:
      return sseOf({ toolCalls: [toolCall('create_view', { tableId: extractTableId(messages, 'Weight-length study'), type: 'scatter', name: 'AI 散点分析' })] })
    case 4:
      return sseOf({
        toolCalls: [
          toolCall('set_chart_config', {
            tableId: extractTableId(messages, 'Weight-length study'),
            viewId: extractViewId(messages),
            chartType: 'scatter',
            configure: { x: { field: 'weight_kg' }, values: [{ field: 'length_cm' }], regression: { model: 'linear' } },
            style: { fitAnnotation: true },
          }),
        ],
      })
    case 5:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 0 })] })
    case 6:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 1 })] })
    case 7:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 2 })] })
    default:
      return sseOf({
        reasoning: '用户要散点图与拟合，我已按步骤完成视图创建与配置。',
        content:
          '已完成：\n- 查看了当前表结构\n- 创建了散点视图「AI 散点分析」并配置 X=weight_kg、Y=length_cm\n- 加了线性拟合与拟合注释\n\n产物已在下方卡片中，可直接点击打开继续编辑。',
      })
  }
}

/** 删除确认流编排：list_tables → delete_table（挂起确认）→ 批准后续跑收尾。 */
function mockSseDelete(messages: Msg[]): string {
  const tools = messages.filter((m) => m.role === 'tool')
  const deleteResult = tools.find((m) => m.name === 'delete_table')
  if (deleteResult && !String(deleteResult.content ?? '').includes('NEEDS_CONFIRMATION')) {
    return sseOf({ content: '已按您的确认删除表，任务完成。' })
  }
  const round = tools.length + 1
  switch (round) {
    case 1:
      return sseOf({ toolCalls: [toolCall('list_tables', {})] })
    case 2:
      return sseOf({ toolCalls: [toolCall('delete_table', { tableId: extractTableId(messages, 'Iris measurements') })] })
    default:
      return sseOf({ content: '删除需要您确认，请点击界面上的「确认执行」按钮。' })
  }
}

/** ask_user 选择流编排：list_tables → ask_user（等待作答）→ 收到回答后收尾。 */
function mockSseAsk(messages: Msg[]): string {
  const round = messages.filter((m) => m.role === 'tool').length + 1
  switch (round) {
    case 1:
      return sseOf({ toolCalls: [toolCall('list_tables', {})] })
    case 2:
      return sseOf({
        toolCalls: [
          toolCall('ask_user', {
            question: '散点图按哪个字段着色分组？',
            options: ['按 species 分组', '按 batch 分组', '不分组'],
            allowOther: true,
          }),
        ],
      })
    default:
      return sseOf({ content: '收到，按你的选择继续配置图表。' })
  }
}

/** 注册 config/chat 拦截（chat 走给定编排）。 */
async function mockAi(page: import('@playwright/test').Page, script: (messages: Msg[]) => string): Promise<void> {
  await page.route('**/api/ai/config', (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      json: { baseUrl: 'https://mock.local/v1', apiKeyMasked: 'm****y', configured: true, model: 'mock-qwen', models: ['mock-qwen-pro'], maxIterations: 100, confirmDestructive: true },
    })
  })
  await page.route('**/api/ai/chat', async (route) => {
    const body = route.request().postDataJSON() as { messages?: Msg[] }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      body: script(body.messages ?? []),
    })
  })
}

test.describe('AI 助手（mock SSE 回放）', () => {
  test('对话驱动建图：进展打勾 → 轨迹卡 → 思考块 → 产物卡 → 点击直达工作区视图', async ({ page }) => {
    await mockAi(page, mockSse)

    await createDemoAndEnter(page)

    // 打开抽屉 → 发指令
    await page.getByTestId('ai-fab').click()
    await expect(page.getByTestId('ai-drawer')).toBeVisible()
    await page.getByTestId('ai-input').fill('把 Weight-length study 画成散点图并加线性拟合')
    await page.getByTestId('ai-send').click()

    // 进展清单：3 步全部打勾
    const plan = page.getByTestId('ai-plan')
    await expect(plan).toBeVisible()
    await expect(plan.locator('.plan__step--done')).toHaveCount(3)

    // 轨迹卡：7 个操作全部完成
    await expect(page.getByTestId('ai-trace')).toContainText('已处理 7 个操作（完成 7）')

    // 思考过程卡（结束后折叠，展开可见 reasoning 文本）
    const reasoning = page.getByTestId('ai-reasoning')
    await expect(reasoning).toContainText('思考过程')
    await reasoning.locator('.reason__head').click()
    await expect(reasoning).toContainText('用户要散点图与拟合')

    // 总结文本
    await expect(page.getByTestId('ai-messages')).toContainText('已完成')

    // 模型选择器：默认模型 + 备选模型切换与还原
    const pill = page.getByTestId('ai-model')
    await expect(pill).toContainText('mock-qwen')
    await pill.click()
    await page.locator('.bar__menu .bar__menu-item', { hasText: 'mock-qwen-pro' }).click()
    await expect(pill).toContainText('mock-qwen-pro')
    await pill.click()
    await page.locator('.bar__menu .bar__menu-item', { hasText: 'mock-qwen' }).first().click()
    await expect(pill).toContainText('mock-qwen')

    // 产物卡出现（视图）；点图表预览区也应打开（pointer-events 穿透）并关闭抽屉
    const artifact = page.getByTestId('ai-artifact').filter({ hasText: 'AI 散点分析' }).first()
    await expect(artifact).toBeVisible()
    const chartCard = artifact.getByTestId('ai-chart-card')
    await expect(chartCard).toBeVisible({ timeout: 15_000 })
    await chartCard.click()
    await expect(page).toHaveURL(/viewId=/)
    await expect(page.getByTestId('ai-drawer')).toHaveCount(0)

    // 工作区真实生效：侧栏出现新视图节点
    await expect(viewNode(page, 'AI 散点分析')).toBeVisible()
  })

  test('危险操作确认流：delete_table → 确认按钮外露 → 确认后表真实删除', async ({ page }) => {
    await mockAi(page, mockSseDelete)

    await createDemoAndEnter(page)
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toBeVisible()

    await page.getByTestId('ai-fab').click()
    await page.getByTestId('ai-input').fill('删除 Iris measurements 表')
    await page.getByTestId('ai-send').click()

    // 待确认块折叠状态也外露，表未被删
    const confirmBtn = page.getByTestId('ai-trace-confirm')
    await expect(confirmBtn).toBeVisible()
    await expect(page.locator('.trace__pending')).toContainText('需要你的批准')
    await expect(page.locator('.trace__pending')).toContainText('删除表「Iris measurements」')
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toBeVisible()

    // 确认执行 → 表真实删除，且同一会话自动续跑给出总结
    await confirmBtn.click()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Iris measurements' })).toHaveCount(0)
    await expect(page.getByTestId('ai-messages')).toContainText('已按您的确认删除表', { timeout: 15_000 })
    await expect(page.getByTestId('ai-trace-confirm')).toHaveCount(0)
  })

  test('ask_user 选择卡：选项单选 → 提交后续轮；输入区显示上下文量与压缩入口', async ({ page }) => {
    await mockAi(page, mockSseAsk)

    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()

    // 输入区：上下文指示器；点开后显示压缩（历史不足 2 轮时禁用）
    const ctx = page.getByTestId('ai-ctx')
    await expect(ctx).toBeVisible()
    await expect(ctx).toContainText('/128k')
    await ctx.click()
    await expect(page.getByTestId('ai-compress')).toBeDisabled()

    await page.getByTestId('ai-input').fill('帮我给当前表配一个散点图')
    await page.getByTestId('ai-send').click()

    // 提问卡：问题 + 选项单选 + 其他回答 + 取消/提交（未选时提交禁用）
    const ask = page.getByTestId('ai-ask')
    await expect(ask).toBeVisible()
    await expect(ask).toContainText('需要你的回答')
    await expect(ask).toContainText('散点图按哪个字段着色分组？')
    await expect(ask.locator('.ask__opt')).toHaveCount(3)
    await expect(page.getByTestId('ai-ask-submit')).toBeDisabled()

    // 单选后提交 → 已答态 + 循环续轮收尾
    await ask.locator('.ask__opt', { hasText: '按 species 分组' }).click()
    await page.getByTestId('ai-ask-submit').click()
    await expect(ask).toContainText('已提交回答')
    await expect(ask).toContainText('按 species 分组')
    await expect(page.getByTestId('ai-messages')).toContainText('收到，按你的选择继续配置图表')
  })
})
