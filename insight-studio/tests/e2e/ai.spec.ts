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
}

function chunk(delta: Record<string, unknown>, finish: string | null = null): string {
  return `data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`
}

let callSeq = 0
function toolCall(name: string, args: Record<string, unknown>): Record<string, unknown> {
  callSeq += 1
  return { index: 0, id: `call_${name}_${callSeq}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

function sseOf(payload: { toolCalls?: Record<string, unknown>[]; content?: string }): string {
  let body = ''
  if (payload.toolCalls) {
    body += chunk({ role: 'assistant', tool_calls: payload.toolCalls })
    body += chunk({}, 'stop')
  } else {
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
        content:
          '已完成：\n- 查看了当前表结构\n- 创建了散点视图「AI 散点分析」并配置 X=weight_kg、Y=length_cm\n- 加了线性拟合与拟合注释\n\n产物已在下方卡片中，可直接点击打开继续编辑。',
      })
  }
}

test.describe('AI 助手（mock SSE 回放）', () => {
  test('对话驱动建图：进展打勾 → 轨迹卡 → 产物卡 → 点击直达工作区视图', async ({ page }) => {
    await page.route('**/api/ai/config', (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      return route.fulfill({
        json: { baseUrl: 'https://mock.local/v1', apiKeyMasked: 'm****y', configured: true, model: 'mock-qwen', maxIterations: 8, confirmDestructive: true },
      })
    })
    await page.route('**/api/ai/chat', async (route) => {
      const body = route.request().postDataJSON() as { messages?: Msg[] }
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: mockSse(body.messages ?? []),
      })
    })

    await createDemoAndEnter(page)

    // 打开抽屉 → 发指令
    await page.getByTestId('ai-entry').click()
    await expect(page.getByTestId('ai-drawer')).toBeVisible()
    await page.getByTestId('ai-input').fill('把 Weight-length study 画成散点图并加线性拟合')
    await page.getByTestId('ai-send').click()

    // 进展清单：3 步全部打勾
    const plan = page.getByTestId('ai-plan')
    await expect(plan).toBeVisible()
    await expect(plan.locator('.plan__step--done')).toHaveCount(3)

    // 轨迹卡：7 个操作全部完成
    await expect(page.getByTestId('ai-trace')).toContainText('已处理 7 个操作（完成 7）')

    // 总结文本
    await expect(page.getByTestId('ai-messages')).toContainText('已完成')

    // 产物卡出现（视图），点击直达工作区
    const artifact = page.getByTestId('ai-artifact').filter({ hasText: 'AI 散点分析' }).first()
    await expect(artifact).toBeVisible()
    await artifact.click()
    await expect(page).toHaveURL(/viewId=/)

    // 工作区真实生效：侧栏出现新视图节点
    await expect(viewNode(page, 'AI 散点分析')).toBeVisible()
  })
})
