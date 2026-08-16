/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureSqlProxyStarted, sqlProxyHealth } from '../../../vite-sql-proxy'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('sqlProxyHealth / ensureSqlProxyStarted', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports healthy when :7120 answers ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true })),
    )
    await expect(sqlProxyHealth()).resolves.toBe(true)
  })

  it('skips spawn when the proxy is already up', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true })),
    )
    await expect(ensureSqlProxyStarted(200)).resolves.toEqual({ ok: true, already: true })
  })
})
