/**
 * Insight Studio SQL 代理（本地）。
 * 浏览器无法直连 Postgres/MySQL，经此前端同源 /api/sql/* 转发。
 *
 * 启动：npm run dev:api   （默认 http://127.0.0.1:7120）
 * Vite 已把 /api/sql 代理到本服务。
 */
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchSchema, runQuery, testConnection, type DbConnectionConfig, type SqlDialect } from './dbDrivers.js'

const PORT = Number(process.env.SQL_PROXY_PORT || 7120)

const app = new Hono()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/api/sql/health', (c) => c.json({ ok: true, service: 'insight-sql-proxy' }))

function readConfig(body: Record<string, unknown>): DbConnectionConfig {
  const dialect = body.dialect as SqlDialect
  if (dialect !== 'postgres' && dialect !== 'mysql') {
    throw new Error('dialect 仅支持 postgres / mysql')
  }
  const host = String(body.host ?? '').trim()
  const database = String(body.database ?? '').trim()
  const user = String(body.user ?? '').trim()
  const password = String(body.password ?? '')
  const port = Number(body.port)
  if (!host) throw new Error('缺少 host')
  if (!database) throw new Error('缺少 database')
  if (!user) throw new Error('缺少 user')
  if (!Number.isFinite(port) || port <= 0) throw new Error('port 无效')
  return {
    dialect,
    host,
    port,
    database,
    user,
    password,
    ssl: Boolean(body.ssl),
  }
}

app.post('/api/sql/test', async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>
    const cfg = readConfig(body)
    const result = await testConnection(cfg)
    return c.json(result)
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : '连接失败' }, 400)
  }
})

app.post('/api/sql/schema', async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>
    const cfg = readConfig(body)
    const tables = await fetchSchema(cfg)
    return c.json({ ok: true, tables })
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : '读取 schema 失败' }, 400)
  }
})

app.post('/api/sql/query', async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>
    const cfg = readConfig(body)
    const sql = String(body.sql ?? '')
    const limit = body.limit == null ? undefined : Number(body.limit)
    const result = await runQuery(cfg, sql, limit)
    return c.json({ ok: true, ...result })
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : '查询失败' }, 400)
  }
})

serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, (info) => {
  console.log(`[insight-sql-proxy] http://127.0.0.1:${info.port}`)
})
