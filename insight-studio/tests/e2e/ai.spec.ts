import { expect, test } from '@playwright/test'
import { createDemoAndEnter, openFlowchart, viewNode } from './helpers'

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

type ChatScriptOut =
  | string
  | { status?: number; json?: Record<string, unknown>; sse?: string; delayMs?: number }

/** 注册 config/chat 拦截（chat 走给定编排）。 */
async function mockAi(page: import('@playwright/test').Page, script: (messages: Msg[]) => ChatScriptOut): Promise<void> {
  await page.route('**/api/ai/config', (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      json: { baseUrl: 'https://mock.local/v1', apiKeyMasked: 'm****y', configured: true, model: 'mock-qwen', models: ['mock-qwen-pro'], maxIterations: 100, confirmDestructive: true },
    })
  })
  await page.route('**/api/ai/chat', async (route) => {
    const body = route.request().postDataJSON() as { messages?: Msg[] }
    const out = script(body.messages ?? [])
    if (typeof out === 'string') {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: out,
      })
    }
    if (out.delayMs) await new Promise((r) => setTimeout(r, out.delayMs))
    if (out.sse) {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: out.sse,
      })
    }
    return route.fulfill({ status: out.status ?? 500, json: out.json ?? { error: 'mock error' } })
  })
}

function toolContent(messages: Msg[], name: string): string {
  const hits = messages.filter((m) => m.role === 'tool' && m.name === name)
  return String(hits[hits.length - 1]?.content ?? '')
}

function extractRe(text: string, re: RegExp, label: string): string {
  const hit = text.match(re)
  if (!hit?.[1]) throw new Error(`mock 未找到 ${label}：${text.slice(0, 200)}`)
  return hit[1]
}

function isResume(messages: Msg[]): boolean {
  return messages.some((m) => m.role === 'system' && String(m.content ?? '').includes('续跑检查点'))
}

/** 多节点管道：两表导入 → filter → join → computed → hide → report → 图 → 看板。 */
function mockSsePipeline(messages: Msg[]): string {
  const tools = messages.filter((m) => m.role === 'tool')
  const round = tools.length + 1
  switch (round) {
    case 1:
      return sseOf({
        toolCalls: [toolCall('submit_plan', { steps: ['导入并过滤', 'Join 与派生列', '报告与出图', '放到看板'] })],
      })
    case 2:
      return sseOf({
        toolCalls: [toolCall('import_csv_text', { tableName: 'hits', csv: 'id,score\n1,10\n2,1\n3,8' })],
      })
    case 3:
      return sseOf({
        toolCalls: [toolCall('import_csv_text', { tableName: 'meta', csv: 'id,batch\n1,A\n2,B\n3,A' })],
      })
    case 4:
      return sseOf({ toolCalls: [toolCall('list_tables', {})] })
    case 5:
      return sseOf({
        toolCalls: [
          toolCall('add_filter_step', {
            tableId: extractTableId(messages, 'hits'),
            conditions: [{ column: 'score', operator: 'gt', value: 5 }],
          }),
        ],
      })
    case 6:
      return sseOf({
        toolCalls: [
          toolCall('add_join_step', {
            leftTableId: extractRe(toolContent(messages, 'add_filter_step'), /产出表 id: ([0-9a-f-]+)/, 'filter 表'),
            rightTableId: extractTableId(messages, 'meta'),
            joinType: 'inner',
            keys: [{ left: 'id', right: 'id' }],
          }),
        ],
      })
    case 7:
      return sseOf({
        toolCalls: [
          toolCall('add_computed_column_step', {
            tableId: extractRe(toolContent(messages, 'add_join_step'), /产出表 id: ([0-9a-f-]+)/, 'join 表'),
            name: 'score2',
            expression: 'score * 2',
          }),
        ],
      })
    case 8:
      return sseOf({
        toolCalls: [
          toolCall('add_hide_columns_step', {
            tableId: extractRe(toolContent(messages, 'add_computed_column_step'), /产出表 id: ([0-9a-f-]+)/, 'computed 表'),
            columns: ['batch'],
          }),
        ],
      })
    case 9:
      return sseOf({ toolCalls: [toolCall('create_report_step', { name: '管道报告' })] })
    case 10:
      return sseOf({
        toolCalls: [
          toolCall('create_view', {
            tableId: extractRe(toolContent(messages, 'add_hide_columns_step'), /产出表 id: ([0-9a-f-]+)/, 'hide 表'),
            type: 'bar',
            name: '管道柱状',
          }),
        ],
      })
    case 11:
      return sseOf({
        toolCalls: [
          toolCall('set_chart_config', {
            viewId: extractViewId(messages),
            configure: { x: { field: 'id' }, y: { field: 'score', aggregation: 'sum' } },
          }),
        ],
      })
    case 12:
      return sseOf({ toolCalls: [toolCall('create_dashboard', { name: '管道看板' })] })
    case 13:
      return sseOf({
        toolCalls: [
          toolCall('add_dashboard_widget', {
            dashboardId: extractRe(toolContent(messages, 'create_dashboard'), /id: ([0-9a-f-]+)/, '看板 id'),
            analysisId: 'current',
            tableId: extractRe(toolContent(messages, 'add_hide_columns_step'), /产出表 id: ([0-9a-f-]+)/, 'hide 表'),
            viewId: extractViewId(messages),
          }),
        ],
      })
    case 14:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 0 })] })
    case 15:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 1 })] })
    case 16:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 2 })] })
    case 17:
      return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 3 })] })
    default:
      return sseOf({
        content: '管道已完成：过滤、Join、派生列、报告、柱状图与看板均已落地。',
      })
  }
}

/** 计划后模拟日配额耗尽；续跑则收尾。 */
function mockSseQuotaThenContinue(messages: Msg[]): ChatScriptOut {
  if (isResume(messages)) {
    const resumeAt = messages.reduce((idx, m, i) =>
      m.role === 'system' && String(m.content ?? '').includes('续跑检查点') ? i : idx, -1)
    const after = messages.slice(resumeAt + 1).filter((m) => m.role === 'tool').length
    if (after === 0) return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 0 })] })
    if (after === 1) return sseOf({ toolCalls: [toolCall('mark_step_done', { index: 1 })] })
    return sseOf({ content: '已从检查点续跑完成。' })
  }
  const round = messages.filter((m) => m.role === 'tool').length + 1
  if (round === 1) return sseOf({ toolCalls: [toolCall('submit_plan', { steps: ['看表', '收尾'] })] })
  if (round === 2) return sseOf({ toolCalls: [toolCall('list_tables', {})] })
  return { status: 502, json: { error: 'token per day limit reached: current: 1509374, limit: 1500000' } }
}

/** 计划提交后卡住第二轮，供测试点中止；续跑收尾。 */
function mockSseAbortThenContinue(messages: Msg[]): ChatScriptOut {
  if (isResume(messages)) {
    return sseOf({ content: '中止后续跑已完成。' })
  }
  const round = messages.filter((m) => m.role === 'tool').length + 1
  if (round === 1) return sseOf({ toolCalls: [toolCall('submit_plan', { steps: ['看表', '出图'] })] })
  return { delayMs: 15_000, sse: sseOf({ toolCalls: [toolCall('list_tables', {})] }) }
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

  test('对话驱动多节点管道：Filter/Join/派生列/报告/图/看板落到流程图', async ({ page }) => {
    test.setTimeout(120_000)
    await mockAi(page, mockSsePipeline)
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
    await mockAi(page, mockSseQuotaThenContinue)
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
    await mockAi(page, mockSseAbortThenContinue)
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
