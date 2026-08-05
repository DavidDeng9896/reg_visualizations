import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { InsightStore, type AnalysisDoc, type DashboardDoc } from './store.ts'
import { registerAiRoutes } from './ai.ts'
import { registerPythonRoutes } from './python.ts'

const store = new InsightStore()
const app = new Hono()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'If-Match', 'Authorization'],
  }),
)

registerAiRoutes(app, store)
registerPythonRoutes(app)

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'insight-api',
    storage: 'sqlite',
    note: 'Mirrors PostgreSQL schema; see migrations/001_init.pg.sql',
  }),
)

app.get('/api/analyses', (c) => c.json(store.listAnalyses()))

app.get('/api/analyses/:id', (c) => {
  const doc = store.getAnalysis(c.req.param('id'))
  if (!doc) return c.json({ error: 'not_found' }, 404)
  return c.json(doc)
})

app.put('/api/analyses/:id', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json()) as AnalysisDoc
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid_body' }, 400)
  if (body.id && body.id !== id) return c.json({ error: 'id_mismatch' }, 400)
  body.id = id

  const ifMatch = c.req.header('If-Match')
  const existing = store.getAnalysis(id)
  if (ifMatch != null && existing) {
    const expected = Number(ifMatch)
    if (Number.isFinite(expected) && (existing.revision ?? 0) !== expected) {
      return c.json(
        { error: 'revision_conflict', currentRevision: existing.revision ?? 0 },
        409,
      )
    }
  }

  const saved = store.putAnalysis(body)
  return c.json(saved)
})

app.delete('/api/analyses/:id', (c) => {
  const ok = store.deleteAnalysis(c.req.param('id'))
  return ok ? c.body(null, 204) : c.json({ error: 'not_found' }, 404)
})

app.get('/api/analyses/:id/tables/:tableId/snapshot', (c) => {
  const snap = store.getLatestSnapshot(c.req.param('id'), c.req.param('tableId'))
  if (!snap) return c.json({ error: 'not_found' }, 404)
  return c.json(snap)
})

app.get('/api/dashboards', (c) => c.json(store.listDashboards()))

app.get('/api/dashboards/:id', (c) => {
  const doc = store.getDashboard(c.req.param('id'))
  if (!doc) return c.json({ error: 'not_found' }, 404)
  return c.json(doc)
})

app.put('/api/dashboards/:id', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json()) as DashboardDoc
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid_body' }, 400)
  body.id = id
  return c.json(store.putDashboard(body))
})

app.delete('/api/dashboards/:id', (c) => {
  const ok = store.deleteDashboard(c.req.param('id'))
  return ok ? c.body(null, 204) : c.json({ error: 'not_found' }, 404)
})

const port = Number(process.env.PORT || 8787)
console.log(`[insight-api] listening on http://127.0.0.1:${port}`)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })

export { app, store }
