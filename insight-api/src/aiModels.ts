/** OpenAI 兼容 `/models` 探测：给设置页填备选列表，避免手填网关不存在的 id。 */

export function parseOpenAiModels(payload: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (id: string) => {
    const t = id.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (typeof item === 'string') push(item)
      else if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        push((item as { id: string }).id)
      }
    }
    return out
  }
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return parseOpenAiModels(data)
  }
  return out
}

/** 当前 id 仍在目录则保留；否则优先 flash，再退回第一项。 */
export function pickRecommendedModel(models: string[], current?: string): string | undefined {
  const ids = models.map((m) => m.trim()).filter(Boolean)
  if (!ids.length) return current?.trim() || undefined
  const cur = (current || '').trim()
  if (cur && ids.includes(cur)) return cur
  const flash = ids.find((id) => /flash/i.test(id) && !/(plus|max)/i.test(id))
  return flash || ids[0]
}

export async function probeOpenAiModels(
  baseUrl: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ models: string[]; error?: string }> {
  const root = baseUrl.trim().replace(/\/$/, '')
  if (!root) return { models: [], error: '缺少 Base URL' }
  if (!apiKey.trim()) return { models: [], error: '缺少 API Key' }
  try {
    const res = await fetchImpl(`${root}/models`, {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text()
    if (!res.ok) {
      return { models: [], error: `探测失败（HTTP ${res.status}）：${text.slice(0, 240) || res.statusText}` }
    }
    let payload: unknown
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      return { models: [], error: '探测失败：响应不是 JSON' }
    }
    const models = parseOpenAiModels(payload)
    if (!models.length) return { models: [], error: '探测成功但目录为空' }
    return { models }
  } catch (e) {
    return { models: [], error: `探测失败：${e instanceof Error ? e.message : String(e)}` }
  }
}
