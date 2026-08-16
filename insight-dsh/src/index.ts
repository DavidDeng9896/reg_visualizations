import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { serve } from '@hono/node-server'
import { boot } from '@deepseek-ai/dsh-app-boot'
import { SYSTEM_PROMPT } from '../../insight-studio/src/modules/ai/prompts'
import { installGoFetch } from './fetchPatch.ts'
import { createAgentApp } from './server.ts'
import { shouldDisableThinking } from './providerPolicy.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const port = Number(process.env.INSIGHT_DSH_PORT || 3081)
const apiOrigin = (process.env.INSIGHT_API_ORIGIN ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const sqlOrigin = (process.env.INSIGHT_SQL_ORIGIN ?? 'http://127.0.0.1:7120').replace(/\/$/, '')

installGoFetch(apiOrigin, sqlOrigin)
process.env.DSH_SYSTEM_PROMPT = process.env.DSH_SYSTEM_PROMPT || SYSTEM_PROMPT
process.env.DSH_SESSION_ROOT = process.env.DSH_SESSION_ROOT || path.join(root, '.sessions')

function applyAiConfigFromDisk() {
  const candidates = [
    process.env.INSIGHT_AI_CONFIG,
    path.resolve(root, '../insight-api/data/ai-config.json'),
    path.resolve(root, '../insight-api-go/data/ai-config.json'),
    path.resolve(process.cwd(), 'data/ai-config.json'),
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8')) as { baseUrl?: string; apiKey?: string; model?: string }
      if (cfg.baseUrl && !process.env.DEEPSEEK_BASE_URL) process.env.DEEPSEEK_BASE_URL = cfg.baseUrl
      if (cfg.apiKey && !process.env.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = cfg.apiKey
      if (cfg.model && !process.env.DSH_MODEL) process.env.DSH_MODEL = cfg.model
      return
    } catch {
      /* try next */
    }
  }
}

/** 非 DeepSeek 官方兼容网关不接受 reasoning_effort=max；未显式配置时自动关思考。 */
function inferThinkingFromProvider() {
  if (shouldDisableThinking(process.env.DEEPSEEK_BASE_URL || '', process.env.DSH_THINKING)) {
    process.env.DSH_THINKING = 'disabled'
  }
  const base = process.env.DEEPSEEK_BASE_URL || ''
  if (/aliyuncs\.com|dashscope|maas\.aliyun|compatible-mode/i.test(base)) {
    // 阿里云兼容端 max_tokens 上限 65536，DeepSeek 适配器默认 256000 会 400
    process.env.DSH_MAX_TOKENS = process.env.DSH_MAX_TOKENS || '32768'
  }
  if (process.env.DSH_THINKING === 'disabled') {
    process.env.DSH_REASONING_EFFORT = process.env.DSH_REASONING_EFFORT || 'off'
  } else {
    process.env.DSH_THINKING = process.env.DSH_THINKING || 'enabled'
    process.env.DSH_REASONING_EFFORT = process.env.DSH_REASONING_EFFORT || 'max'
  }
}

applyAiConfigFromDisk()
inferThinkingFromProvider()

const mock = process.env.INSIGHT_DSH_MOCK === '1'
let dsh: Awaited<ReturnType<typeof boot>> | null = null
if (mock) {
  console.log('[insight-dsh] MOCK mode: skip DeepSeek Harness boot')
} else {
  try {
    dsh = await boot('insight-dsh', path.join(root, 'cordis.yml'))
    console.log(
      `[insight-dsh] DeepSeek Harness booted model=${process.env.DSH_MODEL || '(provider default)'} thinking=${process.env.DSH_THINKING || 'enabled'} maxTokens=${process.env.DSH_MAX_TOKENS || '256000'} base=${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}`,
    )
  } catch (err) {
    console.error('[insight-dsh] dsh boot failed, HTTP will report 503:', err)
  }
}

const app = createAgentApp(dsh as never, { mock })
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[insight-dsh] listening on http://127.0.0.1:${info.port}`)
})
