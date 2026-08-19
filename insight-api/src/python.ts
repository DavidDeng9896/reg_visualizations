/**
 * Node insight-api 透传 Python Worker（与 insight-api-go 行为对齐）。
 * 默认 Worker: http://127.0.0.1:8091
 */
import type { Hono } from 'hono'

export function registerPythonRoutes(app: Hono): void {
  const workerBase = () => (process.env.PYTHON_WORKER_URL || 'http://127.0.0.1:8091').replace(/\/$/, '')

  app.get('/api/python/health', async (c) => {
    try {
      const res = await fetch(`${workerBase()}/health`, { signal: AbortSignal.timeout(4000) })
      const text = await res.text()
      c.header('Content-Type', res.headers.get('Content-Type') || 'application/json')
      return c.body(text, res.status as 200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return c.json(
        {
          ok: false,
          packages: {},
          missing: [],
          error: `python worker unreachable: ${msg}`,
        },
        502,
      )
    }
  })

  app.post('/api/python/execute', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ ok: false, error: { message: 'invalid JSON body' } }, 400)
    }
    if (!body || typeof body !== 'object') {
      return c.json({ ok: false, error: { message: 'invalid body' } }, 400)
    }

    const limits = (body as { limits?: { timeoutSec?: number } }).limits
    const timeoutSec =
      typeof limits?.timeoutSec === 'number' && Number.isFinite(limits.timeoutSec)
        ? Math.max(1, Math.min(900, limits.timeoutSec))
        : 300

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutSec * 1000)
    try {
      const res = await fetch(`${workerBase()}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      const text = await res.text()
      c.header('Content-Type', res.headers.get('Content-Type') || 'application/json')
      return c.body(text, res.status as 200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const base = workerBase()
      return c.json(
        {
          ok: false,
          error: {
            message:
              `python worker unreachable: ${msg}. ` +
              `Start worker: cd python-worker && ./start.sh (Windows: start.cmd) ` +
              `to pip install requirements.txt (rdkit 等) then serve :8091. ` +
              `Expected ${base}/execute; set PYTHON_WORKER_URL if different.`,
          },
        },
        502,
      )
    } finally {
      clearTimeout(timer)
    }
  })
}
