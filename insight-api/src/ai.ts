/**
 * AI 助手后端：配置存储（掩码）+ OpenAI 兼容 SSE 代理 + 会话 CRUD。
 * 契约对齐后续 insight-api-go 的复刻实现。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { InsightStore } from './store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.resolve(__dirname, '../data/ai-config.json')

/* ------------------------------- 配置 ------------------------------- */

export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
  /** 备选模型列表（前端输入条可切换）。 */
  models: string[]
  /** agent-loop 最大工具调用轮数（1–100）。 */
  maxIterations: number
  /** 删除类操作是否需要用户确认。 */
  confirmDestructive: boolean
}

const DEFAULT_CONFIG: AiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  models: [],
  maxIterations: 100,
  confirmDestructive: true,
}

function readConfig(): AiConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function writeConfig(next: AiConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
}

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}…••••…${key.slice(-4)}`
}

/** OpenAI chat 请求体（仅做必要校验后原样转发）。 */
interface ChatPayload {
  messages: unknown[]
  tools?: unknown[]
  [k: string]: unknown
}

/* ------------------------------- 会话 ------------------------------- */

interface ConversationRow {
  id: string
  analysis_id: string | null
  title: string
  created_at: string
  updated_at: string
  messages: string
}

export interface ConversationDoc {
  id: string
  analysisId: string | null
  title: string
  createdAt: string
  updatedAt: string
  messages: unknown[]
}

function rowToDoc(r: ConversationRow): ConversationDoc {
  return {
    id: r.id,
    analysisId: r.analysis_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messages: JSON.parse(r.messages || '[]') as unknown[],
  }
}

/* ------------------------------- 路由 ------------------------------- */

export function registerAiRoutes(app: Hono, store: InsightStore): void {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      analysis_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS ai_conv_updated ON ai_conversations(updated_at DESC);
  `)

  /* ---- 配置 ---- */
  app.get('/api/ai/config', (c) => {
    const cfg = readConfig()
    return c.json({
      baseUrl: cfg.baseUrl,
      apiKeyMasked: maskKey(cfg.apiKey),
      configured: !!cfg.apiKey,
      model: cfg.model,
      models: cfg.models,
      maxIterations: cfg.maxIterations,
      confirmDestructive: cfg.confirmDestructive,
    })
  })

  app.put('/api/ai/config', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Partial<AiConfig> | null
    if (!body || typeof body !== 'object') return c.json({ error: 'invalid_body' }, 400)
    const cur = readConfig()
    // apiKey：字段缺失 / null / 非字符串 → 保留；非空字符串 → 更新；空串 → 清空
    let nextApiKey = cur.apiKey
    if (typeof body.apiKey === 'string') nextApiKey = body.apiKey.trim()
    const next: AiConfig = {
      baseUrl: typeof body.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl.trim().replace(/\/$/, '') : cur.baseUrl,
      apiKey: nextApiKey,
      model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : cur.model,
      models: Array.isArray(body.models)
        ? [...new Set(body.models.filter((m): m is string => typeof m === 'string' && !!m.trim()).map((m) => m.trim()))]
        : cur.models,
      maxIterations:
        typeof body.maxIterations === 'number' && Number.isFinite(body.maxIterations)
          ? Math.min(100, Math.max(1, Math.round(body.maxIterations)))
          : cur.maxIterations,
      confirmDestructive: typeof body.confirmDestructive === 'boolean' ? body.confirmDestructive : cur.confirmDestructive,
    }
    try {
      writeConfig(next)
    } catch (e) {
      return c.json({ error: 'write_failed', message: e instanceof Error ? e.message : String(e) }, 500)
    }
    return c.json({ ok: true, configured: !!next.apiKey, apiKeyMasked: maskKey(next.apiKey) })
  })

  /* ---- 聊天代理（SSE 原样透传） ---- */
  app.post('/api/ai/chat', async (c) => {
    const cfg = readConfig()
    if (!cfg.apiKey) return c.json({ error: 'ai_not_configured' }, 409)
    const payload = (await c.req.json().catch(() => null)) as ChatPayload | null
    if (!payload || !Array.isArray(payload.messages)) return c.json({ error: 'invalid_body' }, 400)

    let upstream: Response
    try {
      upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({ ...payload, model: payload.model ?? cfg.model, stream: true }),
      })
    } catch (e) {
      return c.json({ error: 'upstream_unreachable', message: e instanceof Error ? e.message : String(e) }, 502)
    }
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      return c.json({ error: 'upstream_error', status: upstream.status, message: text.slice(0, 2000) }, 502)
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  })

  /* ---- 会话 CRUD ---- */
  app.get('/api/ai/conversations', (c) => {
    const rows = store.db
      .prepare('SELECT id, analysis_id, title, created_at, updated_at FROM ai_conversations ORDER BY updated_at DESC LIMIT 100')
      .all() as Omit<ConversationRow, 'messages'>[]
    return c.json(rows.map((r) => ({ id: r.id, analysisId: r.analysis_id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at })))
  })

  app.post('/api/ai/conversations', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { analysisId?: string; title?: string; messages?: unknown[] }
    const now = new Date().toISOString()
    const doc: ConversationDoc = {
      id: randomUUID(),
      analysisId: typeof body.analysisId === 'string' ? body.analysisId : null,
      title: typeof body.title === 'string' ? body.title : '新会话',
      createdAt: now,
      updatedAt: now,
      messages: Array.isArray(body.messages) ? body.messages : [],
    }
    store.db
      .prepare('INSERT INTO ai_conversations (id, analysis_id, title, created_at, updated_at, messages) VALUES (?, ?, ?, ?, ?, ?)')
      .run(doc.id, doc.analysisId, doc.title, doc.createdAt, doc.updatedAt, JSON.stringify(doc.messages))
    return c.json(doc, 201)
  })

  app.get('/api/ai/conversations/:id', (c) => {
    const row = store.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(c.req.param('id')) as ConversationRow | undefined
    if (!row) return c.json({ error: 'not_found' }, 404)
    return c.json(rowToDoc(row))
  })

  app.put('/api/ai/conversations/:id', async (c) => {
    const id = c.req.param('id')
    const row = store.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as ConversationRow | undefined
    if (!row) return c.json({ error: 'not_found' }, 404)
    const body = (await c.req.json().catch(() => ({}))) as { title?: string; messages?: unknown[]; analysisId?: string | null }
    const doc = rowToDoc(row)
    if (typeof body.title === 'string') doc.title = body.title
    if (Array.isArray(body.messages)) doc.messages = body.messages
    if (body.analysisId !== undefined) doc.analysisId = body.analysisId
    doc.updatedAt = new Date().toISOString()
    store.db
      .prepare('UPDATE ai_conversations SET title = ?, analysis_id = ?, updated_at = ?, messages = ? WHERE id = ?')
      .run(doc.title, doc.analysisId, doc.updatedAt, JSON.stringify(doc.messages), id)
    return c.json(doc)
  })

  app.delete('/api/ai/conversations/:id', (c) => {
    const info = store.db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(c.req.param('id'))
    return info.changes > 0 ? c.body(null, 204) : c.json({ error: 'not_found' }, 404)
  })
}
