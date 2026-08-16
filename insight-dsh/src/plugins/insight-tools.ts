import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { TOOL_DEFS } from '../../../insight-studio/src/modules/ai/tools/registry'
import { execTool, type ToolCtx } from '../../../insight-studio/src/modules/ai/tools/execCore'
import { runWithWorkspaceAsync } from '../../../insight-studio/src/modules/ai/tools/workspace'
import { goRequestContext } from '../fetchPatch.ts'
import { readyHttpWorkspace } from '../httpWorkspace.ts'
import { getSessionRuntime } from '../runtime.ts'
import { jsonSchemaToDshParams, toLosslessJson } from '../dshParams.ts'
import { REJECTED_NO_CHANGE, renderToolValue, withSanitizedSummary } from '../toolReply.ts'

export const name = 'insight-tools'
export const inject = ['tools']

function lookupRuntime(exec: { agent?: { id: unknown; session?: { id?: unknown } }; callId?: unknown; token?: unknown }) {
  const agent = exec.agent
  if (!agent) return undefined
  return (
    getSessionRuntime(String(agent.id)) ??
    getSessionRuntime(String(agent.session?.id ?? ''))
  )
}

export function apply(ctx: Context) {
  for (const def of TOOL_DEFS) {
    if (def.name.startsWith('delegate_') || def.name === 'ask_user' || def.name === 'submit_plan' || def.name === 'mark_step_done') {
      continue
    }
    ctx.tools.register(
      defineTool({
        name: def.name,
        description: def.description,
        parameters: jsonSchemaToDshParams(def.parameters as never),
        output: {
          schema: { type: 'json' },
          render: (_args, value) => [{ type: 'text', text: renderToolValue(value, def.name) }],
        },
        async execute(args, exec) {
          const runtime = lookupRuntime(exec)
          const toolCtx: ToolCtx = {
            confirmDestructive: runtime?.confirmDestructive ?? true,
            confirmWrite: runtime?.confirmWrite ?? false,
          }
          return goRequestContext.run({ userId: runtime?.userId ?? 'david' }, async () => {
            const ws = await readyHttpWorkspace({
              analysisId: runtime?.analysisId,
              sqlConnections: runtime?.sqlConnections,
            })
            if (runtime?.analysisId && !ws.current) await ws.load(runtime.analysisId)
            const result = await runWithWorkspaceAsync(ws, () => execTool(def.name, args as Record<string, unknown>, toolCtx))
            if (result.needsConfirmation && runtime) {
              const decision = await runtime.waitConfirm({
                id: String(exec.callId ?? exec.token ?? def.name),
                name: def.name,
                summary: result.summary,
              })
              if (decision === 'reject') {
                return { ok: false, summary: REJECTED_NO_CHANGE }
              }
              const confirmed = await runWithWorkspaceAsync(ws, () =>
                execTool(def.name, { ...(args as Record<string, unknown>), __confirmed: true }, toolCtx),
              )
              if (confirmed.artifact?.analysisId && runtime) runtime.analysisId = confirmed.artifact.analysisId
              else if (ws.current && runtime) runtime.analysisId = ws.current.id
              return withSanitizedSummary(toLosslessJson(confirmed), def.name)
            }
            if (result.artifact?.analysisId && runtime) runtime.analysisId = result.artifact.analysisId
            else if (ws.current && runtime) runtime.analysisId = ws.current.id
            return withSanitizedSummary(toLosslessJson(result), def.name)
          })
        },
      }),
    )
  }

  ctx.tools.register(
    defineTool({
      name: 'ask_user',
      description: '需要用户拍板时调用：以卡片形式向用户提问并暂停等待作答。',
      parameters: {
        question: { type: 'string', required: true, description: '问题' },
        options: { type: 'array', items: { type: 'string' }, description: '可选答案' },
        allowOther: { type: 'boolean', description: '允许自定义回答' },
      },
      output: {
        schema: { type: 'string' },
        render: (_a, value) => [{ type: 'text', text: String(value) }],
      },
      async execute(args, exec) {
        const runtime = lookupRuntime(exec)
        if (!runtime) return '（无法向用户提问）'
        return runtime.waitAsk({
          id: String(exec.callId ?? exec.token ?? `ask-${Date.now()}`),
          question: String(args.question ?? ''),
          options: Array.isArray(args.options) ? args.options.map(String) : [],
          allowOther: args.allowOther !== false,
        })
      },
    }),
  )

  for (const kind of ['skill', 'mcp', 'analysis', 'code'] as const) {
    const toolName = `delegate_${kind}_worker`
    const role =
      kind === 'skill' ? '规划师' : kind === 'mcp' ? 'MCP 专家' : kind === 'analysis' ? '分析师' : '工程师'
    ctx.tools.register(
      defineTool({
        name: toolName,
        description: `派发「${role}」子代理：独立 session 完成 goal 后摘要返回。`,
        parameters: { goal: { type: 'string', required: true, description: '子代理目标' } },
        output: {
          schema: { type: 'string' },
          render: (_a, value) => [{ type: 'text', text: String(value) }],
        },
        async execute(args, exec) {
          const runtime = lookupRuntime(exec)
          runtime?.emit({ type: 'worker_progress', id: toolName, summary: `${role}进行中` })
          if (!exec.agent) return `${role}无法启动：缺少 agent 上下文`
          const handle = await exec.agent.ctx.agents.create({
            meta: { origin: 'subagent', parentSession: exec.agent.id, cwd: process.cwd() },
            agentOptions: exec.agent.options,
          })
          const { createUserMessage } = await import('@deepseek-ai/dsh-llm')
          handle.agent.followup(
            createUserMessage({
              content: [{ type: 'text', text: `你是${role}。请完成：${String(args.goal ?? '')}。完成后给出简洁中文摘要。` }],
              source: { kind: 'user' },
            }),
          )
          await handle.agent.whenIdle()
          const text = lastAssistantText(handle.agent.session) || `${role}已结束`
          await handle.dispose()
          return text
        },
      }),
    )
  }

  ctx.tools.register(
    defineTool({
      name: 'submit_plan',
      description: '开工前必须调用：提交执行计划（3-6 个步骤），之后严格按计划执行。',
      parameters: { steps: { type: 'array', items: { type: 'string' }, required: true, description: '步骤简述' } },
      output: {
        schema: { type: 'string' },
        render: (_a, value) => [{ type: 'text', text: String(value) }],
      },
      async execute(args, exec) {
        const runtime = lookupRuntime(exec)
        const steps = Array.isArray(args.steps) ? args.steps.map(String).filter(Boolean) : []
        if (runtime) {
          runtime.planSteps = steps
          runtime.planDone = []
          runtime.emit({ type: 'plan', steps })
        }
        return `已提交 ${steps.length} 步计划`
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'mark_step_done',
      description: '每完成计划中的一个步骤后调用，用于更新进展。',
      parameters: { index: { type: 'number', required: true, description: '步骤序号（从 0 开始）' } },
      output: {
        schema: { type: 'string' },
        render: (_a, value) => [{ type: 'text', text: String(value) }],
      },
      async execute(args, exec) {
        const runtime = lookupRuntime(exec)
        const index = Number(args.index)
        if (runtime && Number.isFinite(index)) {
          if (!runtime.planDone.includes(index)) runtime.planDone.push(index)
          runtime.emit({ type: 'step_done', index })
        }
        return `已完成步骤 ${index}`
      },
    }),
  )

}

function lastAssistantText(session: { events?: unknown } | { getEvents?: () => unknown[] }): string {
  const events =
    typeof (session as { getEvents?: () => unknown[] }).getEvents === 'function'
      ? (session as { getEvents: () => unknown[] }).getEvents()
      : ((session as { events?: unknown[] }).events ?? [])
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i] as { type?: string; data?: { content?: unknown; message?: { content?: unknown } } }
    if (String(e?.type ?? '') !== 'assistant/message' && !String(e?.type ?? '').includes('assistant')) continue
    const c = e.data?.message?.content ?? e.data?.content
    if (typeof c === 'string') return c
    if (Array.isArray(c)) {
      return c.map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : '')).join('')
    }
  }
  return ''
}
