import { AsyncLocalStorage } from 'node:async_hooks'

export interface GoRequestContext {
  userId: string
}

export const goRequestContext = new AsyncLocalStorage<GoRequestContext>()

function rewriteUrl(raw: string, apiOrigin: string, sqlOrigin: string): string {
  if (raw.startsWith('/api/sql')) return `${sqlOrigin}${raw}`
  if (raw.startsWith('/')) return `${apiOrigin}${raw}`
  return raw
}

/** 把相对路径 /api/* 转到 Go / SQL 代理，并注入 X-User-Id。 */
export function installGoFetch(apiOrigin: string, sqlOrigin: string): void {
  const orig = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = rewriteUrl(raw, apiOrigin, sqlOrigin)
    const headers = new Headers(init?.headers)
    if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
    const userId = goRequestContext.getStore()?.userId
    if (userId) headers.set('X-User-Id', userId)
    if (typeof input === 'string' || input instanceof URL) {
      return orig(url, { ...init, headers })
    }
    return orig(new Request(url, input), { ...init, headers })
  }) as typeof fetch
}
