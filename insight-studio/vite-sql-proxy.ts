/**
 * Vite 开发插件：一键拉起本机 SQL 代理（tsx server/index.ts → :7120）。
 * 浏览器无法 spawn 进程，由已在跑的 Vite 代为启动。
 */
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin, ViteDevServer } from 'vite'

const PORT = Number(process.env.SQL_PROXY_PORT || 7120)
export const SQL_PROXY_START_PATH = '/__insight/sql-proxy/start'

const root = path.dirname(fileURLToPath(import.meta.url))

let child: ChildProcess | null = null

function sendJson(res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export async function sqlProxyHealth(port = PORT): Promise<boolean> {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/sql/health`, { signal: AbortSignal.timeout(800) })
    if (!r.ok) return false
    const data = (await r.json()) as { ok?: boolean }
    return !!data.ok
  } catch {
    return false
  }
}

function spawnProxy(): ChildProcess {
  const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!fs.existsSync(tsxCli)) {
    throw new Error('未找到 tsx，请先在 insight-studio 目录执行 npm install')
  }
  const entry = path.join(root, 'server', 'index.ts')
  const proc = spawn(process.execPath, [tsxCli, entry], {
    cwd: root,
    env: { ...process.env, SQL_PROXY_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout?.resume()
  proc.stderr?.resume()
  proc.on('exit', () => {
    if (child === proc) child = null
  })
  return proc
}

export async function ensureSqlProxyStarted(timeoutMs = 15_000): Promise<{ ok: boolean; already?: boolean; error?: string }> {
  if (await sqlProxyHealth()) return { ok: true, already: true }
  let spawnError = ''
  try {
    if (!child || child.killed || child.exitCode != null) {
      child = spawnProxy()
      child.once('error', (err) => {
        spawnError = err instanceof Error ? err.message : String(err)
      })
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const started = child
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await sqlProxyHealth()) return { ok: true }
    if (spawnError) return { ok: false, error: `SQL 代理启动失败：${spawnError}` }
    if (started && started.exitCode != null) {
      return { ok: false, error: `SQL 代理进程已退出（code=${started.exitCode}）` }
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return { ok: false, error: 'SQL 代理启动超时。也可在项目目录运行 npm run dev:api' }
}

function attachStartRoute(server: ViteDevServer): void {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const pathname = (req.url ?? '').split('?')[0]
    if (pathname !== SQL_PROXY_START_PATH) {
      next()
      return
    }
    if (req.method !== 'POST' && req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    const result = await ensureSqlProxyStarted()
    sendJson(res, result.ok ? 200 : 503, result)
  }
  server.middlewares.use(handler)
  server.httpServer?.once('close', () => {
    child?.kill()
    child = null
  })
}

export function sqlProxyDevPlugin(): Plugin {
  return {
    name: 'insight-sql-proxy-dev',
    configureServer: attachStartRoute,
    configurePreviewServer: attachStartRoute,
  }
}
