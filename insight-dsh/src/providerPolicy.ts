/** 根据兼容网关推断 DeepSeek 适配器的思考策略与 max_tokens。不改 dsh 包，只设环境变量。 */

const COMPATIBLE_GATEWAY = /aliyuncs\.com|dashscope|maas\.aliyun|compatible-mode/i

export function isCompatibleGateway(baseUrl: string): boolean {
  return COMPATIBLE_GATEWAY.test(baseUrl || '')
}

export function shouldDisableThinking(baseUrl: string, explicitThinking?: string): boolean {
  if (explicitThinking) return false
  return isCompatibleGateway(baseUrl)
}

export function recommendedMaxTokens(baseUrl: string): number {
  return isCompatibleGateway(baseUrl) ? 32768 : 256000
}

/** 未显式配置时：兼容网关关思考、钳 max_tokens，并避免 reasoning_effort=max。 */
export function applyGatewayEnv(env: NodeJS.ProcessEnv = process.env): void {
  const base = env.DEEPSEEK_BASE_URL || ''
  if (shouldDisableThinking(base, env.DSH_THINKING)) {
    env.DSH_THINKING = 'disabled'
  }
  if (isCompatibleGateway(base)) {
    env.DSH_MAX_TOKENS = env.DSH_MAX_TOKENS || String(recommendedMaxTokens(base))
  }
  if (env.DSH_THINKING === 'disabled') {
    env.DSH_REASONING_EFFORT = env.DSH_REASONING_EFFORT || 'off'
  } else {
    env.DSH_THINKING = env.DSH_THINKING || 'enabled'
    env.DSH_REASONING_EFFORT = env.DSH_REASONING_EFFORT || 'max'
  }
}

export function pickRecommendedModel(models: string[], current?: string): string | undefined {
  const ids = models.map((m) => m.trim()).filter(Boolean)
  if (!ids.length) return current?.trim() || undefined
  const cur = (current || '').trim()
  if (cur && ids.includes(cur)) return cur
  const flash = ids.find((id) => /flash/i.test(id) && !/(plus|max)/i.test(id))
  return flash || ids[0]
}
