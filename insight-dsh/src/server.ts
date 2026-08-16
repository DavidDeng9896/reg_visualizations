import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { Context as CordisContext } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { buildMcpToolsBundle } from '../../insight-studio/src/modules/ai/mcpTools'
import { planIncomplete, pendingPlanSteps } from '../../insight-studio/src/modules/ai/taskState'
import { sessionEventToAgentEvents } from './events.ts'
import { bindAgentRuntime, ensureSessionRuntime, getSessionRuntime } from './runtime.ts'
import { goRequestContext } from './fetchPatch.ts'
import { runMockTurn } from './mockAgent.ts'
import type { AgentEvent } from '../../insight-studio/src/modules/ai/agentLoop'

const registeredMcp = new Set<string>()

type AgentHandle = {
  agent: {
    id: string
    followup: (msg: unknown) => void
    inject: (msg: unknown, opts?: unknown) => void
    cancel: (reason: unknown) => void
    whenIdle: () => Promise<void>
    session: unknown
  }
  dispose: () => Promise<void>
}

export function createAgentApp(dsh: CordisContext | null, opts?: { mock?: boolean }) {
  const app = new Hono()
  const agents = new Map<string, AgentHandle>()
  const mock = opts?.mock === true || process.env.INSIGHT_DSH_MOCK === '1'

  const handlePrompt = async (c: {
    req: { json: <T>() => Promise<T>; header: (n: string) => string | undefined }
    json: (b: unknown, s?: number) => Response
  }) => {
    if (!mock && !dsh) return c.json({ error: 'dsh_not_booted' }, 503)
    const body = await c.req.json<{
      sessionId: string
      text: string
      model?: string
      userId?: string
      analysisId?: string
      context?: string
      sqlConnections?: unknown[]
      confirmDestructive?: boolean
      confirmWrite?: boolean
      images?: Array<{ url: string }>
    }>()
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) return c.json({ error: 'missing sessionId' }, 400)
    const userId = body.userId || c.req.header('X-User-Id') || 'david'

    return streamSSE(c as never, async (stream) => {
      const emit = async (e: AgentEvent) => {
        await stream.writeSSE({ event: 'agent', data: JSON.stringify(e) })
      }
      const runtime = ensureSessionRuntime(
        sessionId,
        {
          userId,
          analysisId: body.analysisId,
          sqlConnections: (body.sqlConnections as never) ?? [],
          confirmDestructive: body.confirmDestructive,
          confirmWrite: body.confirmWrite,
        },
        (e) => {
          void emit(e)
        },
      )

      try {
        if (mock) {
          await goRequestContext.run({ userId }, () => runMockTurn(body.text || '请继续。', runtime, emit))
          return
        }

        const rec = await getOrCreateAgent(dsh!, agents, sessionId, body.model)
        bindAgentRuntime(sessionId, rec.agent.id)
        const unsub = subscribeSession(dsh!, rec.agent.session, (raw) => {
          for (const ev of sessionEventToAgentEvents(raw)) void emit(ev)
        })

        try {
          await goRequestContext.run({ userId }, () => syncMcpTools(dsh!, userId))
          if (body.context?.trim()) {
            rec.agent.inject(
              createUserMessage({
                content: [{ type: 'text', text: body.context.trim() }],
                source: { kind: 'plugin', plugin: 'insight-dsh' },
              }),
            )
          }
          const blocks: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            { type: 'text', text: body.text || '请继续。' },
          ]
          for (const img of body.images ?? []) {
            blocks.push({ type: 'image_url', image_url: { url: img.url } })
          }
          rec.agent.followup(
            createUserMessage({
              content: blocks as never,
              source: { kind: 'user' },
            }),
          )
          await rec.agent.whenIdle()
          if (planIncomplete(runtime.planSteps, runtime.planDone)) {
            await emit({
              type: 'incomplete',
              reason: 'plan_incomplete',
              pendingSteps: pendingPlanSteps(runtime.planSteps, runtime.planDone),
            })
          }
          await emit({ type: 'done', content: '' })
        } finally {
          unsub()
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          await emit({ type: 'error', message: '已中止' })
          return
        }
        await emit({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    })
  }

  app.get('/health', (c) => c.json({ ok: true, runtime: mock ? 'dsh-mock' : 'dsh', booted: mock || !!dsh }))
  app.get('/api/ai/agent/health', (c) => c.json({ ok: true, runtime: mock ? 'dsh-mock' : 'dsh', booted: mock || !!dsh }))
  app.post('/prompt', handlePrompt as never)
  app.post('/api/ai/agent/prompt', handlePrompt as never)

  const handleAnswer = async (c: { req: { json: <T>() => Promise<T> }; json: (b: unknown) => Response }) => {
    const body = await c.req.json<{ sessionId: string; id: string; answer: string }>()
    getSessionRuntime(body.sessionId)?.resolveAsk(body.id, body.answer)
    return c.json({ ok: true })
  }
  app.post('/answer', handleAnswer as never)
  app.post('/api/ai/agent/answer', handleAnswer as never)

  const handleConfirm = async (c: { req: { json: <T>() => Promise<T> }; json: (b: unknown) => Response }) => {
    const body = await c.req.json<{ sessionId: string; id: string; decision: 'confirm' | 'reject' }>()
    getSessionRuntime(body.sessionId)?.resolveConfirm(body.id, body.decision === 'confirm' ? 'confirm' : 'reject')
    return c.json({ ok: true })
  }
  app.post('/confirm', handleConfirm as never)
  app.post('/api/ai/agent/confirm', handleConfirm as never)

  const handleAbort = async (c: { req: { json: <T>() => Promise<T> }; json: (b: unknown) => Response }) => {
    const body = await c.req.json<{ sessionId: string }>()
    const rec = agents.get(body.sessionId)
    getSessionRuntime(body.sessionId)?.abort()
    rec?.agent.cancel({ kind: 'user' })
    return c.json({ ok: true })
  }
  app.post('/abort', handleAbort as never)
  app.post('/api/ai/agent/abort', handleAbort as never)

  return app
}

async function getOrCreateAgent(
  dsh: CordisContext,
  agents: Map<string, AgentHandle>,
  sessionId: string,
  model?: string,
): Promise<AgentHandle> {
  const existing = agents.get(sessionId)
  if (existing) return existing
  const handle = (await dsh.agents.create({
    sessionId: SessionId(sessionId),
    meta: { cwd: process.cwd() },
    agentOptions: {
      provider: 'deepseek-official',
      ...(model ? { model } : {}),
    },
  })) as AgentHandle
  agents.set(sessionId, handle)
  bindAgentRuntime(sessionId, handle.agent.id)
  return handle
}

function subscribeSession(
  dsh: CordisContext,
  session: unknown,
  onEvent: (e: unknown) => void,
): () => void {
  const sid = String((session as { id?: unknown })?.id ?? '')
  const ctx = dsh as CordisContext & { on?: (ev: string, fn: (...args: unknown[]) => void) => () => void }
  if (typeof ctx.on === 'function') {
    return ctx.on('session/event', (...args: unknown[]) => {
      const sess = args.length > 1 ? args[0] : session
      const event = args.length > 1 ? args[1] : args[0]
      const id = String((sess as { id?: unknown })?.id ?? '')
      if (sid && id && id !== sid) return
      onEvent(event)
    })
  }
  const s = session as {
    on?: (ev: string, fn: (e: unknown) => void) => () => void
    subscribe?: (fn: (e: unknown) => void) => () => void
  }
  if (typeof s.on === 'function') {
    const off = s.on('event', onEvent)
    return typeof off === 'function' ? off : () => undefined
  }
  if (typeof s.subscribe === 'function') return s.subscribe(onEvent)
  return () => undefined
}

function mcpParamsFromSchema(schema: unknown): Record<string, { type: string; description?: string; required?: true; items?: { type: string } }> {
  const s = schema as {
    properties?: Record<string, { type?: string; description?: string; items?: { type?: string } }>
    required?: string[]
  }
  const required = new Set(s?.required ?? [])
  const out: Record<string, { type: string; description?: string; required?: true; items?: { type: string } }> = {}
  for (const [key, prop] of Object.entries(s?.properties ?? {})) {
    const t =
      prop.type === 'array'
        ? 'array'
        : prop.type === 'number' || prop.type === 'integer'
          ? 'number'
          : prop.type === 'boolean'
            ? 'boolean'
            : prop.type === 'object'
              ? 'json'
              : 'string'
    out[key] = {
      type: t,
      description: prop.description,
      ...(required.has(key) ? { required: true as const } : {}),
      ...(t === 'array' ? { items: { type: prop.items?.type === 'number' ? 'number' : 'string' } } : {}),
    }
  }
  if (!Object.keys(out).length) {
    out.payload = { type: 'json', description: 'MCP 参数（原样转发）' }
  }
  return out
}

async function syncMcpTools(dsh: CordisContext, _userId: string) {
  try {
    const list = await fetch('/api/ai/mcp/tools').then((r) => (r.ok ? r.json() : []))
    const bundle = buildMcpToolsBundle(Array.isArray(list) ? list : [])
    for (const t of bundle.tools) {
      const fnName = t.function.name
      if (registeredMcp.has(fnName)) continue
      registeredMcp.add(fnName)
      const ref = bundle.resolve(fnName)
      const rawParams = (t.function as { parameters?: unknown }).parameters
      dsh.tools.register(
        defineTool({
          name: fnName,
          description: t.function.description,
          parameters: mcpParamsFromSchema(rawParams),
          output: {
            schema: { type: 'json' },
            render: (_a, v) => [{ type: 'text', text: JSON.stringify(v) }],
          },
          async execute(args) {
            if (!ref) return { ok: false, error: 'unknown mcp tool' }
            const payload =
              args && typeof args === 'object' && 'payload' in args && Object.keys(args).length === 1
                ? (args as { payload: unknown }).payload
                : args
            const res = await fetch('/api/ai/mcp/tools/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ serverId: ref.serverId, name: ref.name, arguments: payload ?? {} }),
            })
            return res.json()
          },
        }),
      )
    }
  } catch {
    /* MCP 不可用时跳过，内置工具仍可用 */
  }
}
