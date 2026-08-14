import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSqlProxyHealth, startSqlProxy } from '../../../src/modules/table/remoteSql'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('startSqlProxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the Vite start endpoint then confirms health', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input)
      if (href.includes('/__insight/sql-proxy/start')) return jsonResponse({ ok: true })
      if (href.includes('/api/sql/health')) return jsonResponse({ ok: true })
      return jsonResponse({ ok: false }, 404)
    })
    vi.stubGlobal('fetch', fetchImpl)
    await startSqlProxy()
    expect(fetchImpl).toHaveBeenCalledWith('/__insight/sql-proxy/start', { method: 'POST' })
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/api/sql/health'))).toBe(true)
  })

  it('throws a terminal hint when the start route is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Not Found', { status: 404 })),
    )
    await expect(startSqlProxy()).rejects.toThrow(/npm run dev:api/)
  })

  it('throws when the start request cannot reach Vite', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(startSqlProxy()).rejects.toThrow(/无法请求开发服务器/)
  })

  it('throws the proxy error payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: false, error: 'SQL 代理启动超时' }, 503)),
    )
    await expect(startSqlProxy()).rejects.toThrow(/启动超时/)
  })
})

describe('checkSqlProxyHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when /api/sql/health is ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true })),
    )
    await expect(checkSqlProxyHealth()).resolves.toBe(true)
  })

  it('returns false when the proxy is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(checkSqlProxyHealth()).resolves.toBe(false)
  })
})
