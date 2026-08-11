/**
 * 思考过程展示预算：跨轮清空 + 单轮封顶，避免 reasoning 墙。
 */
export const REASONING_DISPLAY_CAP = 2800

export function capReasoningText(text: string, cap = REASONING_DISPLAY_CAP): string {
  const s = String(text ?? '')
  if (s.length <= cap) return s
  return `…(前文思考已省略 ${s.length - cap} 字)…\n${s.slice(-cap)}`
}

/**
 * 可见回复去重：折叠连续高度相似的短句/段落，抑制 agent 复读墙。
 */
const FILLER_LINE =
  /^(好的?[，,.。！!\s]*)?(让我|我来|开始执行|先确认|直接调用|直接执行|开始创建)/

/** 规范化一行便于比较。 */
export function normalizeLine(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/[：:。.!！?？,，、；;]+$/g, '')
}

/**
 * 去掉连续重复段落与「好，让我直接…」类填充句堆叠。
 * 保留首个出现；若全文几乎全是同一句循环，压成一句并加省略说明。
 */
export function scrubVisibleContent(text: string, opts?: { maxLines?: number }): string {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  const maxLines = opts?.maxLines ?? 40
  const parts = raw.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) {
    // 单段内用句号切分再去重
    const sentences = raw.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter(Boolean)
    if (sentences.length < 4) return raw
    return collapseSimilar(sentences, maxLines).join('')
  }
  return collapseSimilar(parts, maxLines).join('\n\n')
}

function collapseSimilar(parts: string[], maxLines: number): string[] {
  const out: string[] = []
  const seen = new Map<string, number>()
  let dropped = 0
  let fillerKept = 0
  for (const p of parts) {
    const key = normalizeLine(p)
    if (!key) continue
    const count = seen.get(key) ?? 0
    // 完全重复：只留 1 次
    if (count >= 1) {
      dropped += 1
      seen.set(key, count + 1)
      continue
    }
    // 填充短句过多时丢弃后续同类
    if (FILLER_LINE.test(p)) {
      if (fillerKept >= 2) {
        dropped += 1
        continue
      }
      fillerKept += 1
    }
    seen.set(key, 1)
    out.push(p)
    if (out.length >= maxLines) {
      dropped += parts.length - parts.indexOf(p) - 1
      break
    }
  }
  if (dropped > 0 && out.length) {
    out.push(`…（已省略 ${dropped} 处重复表述）`)
  }
  return out
}

/** 两段文本是否高度相似（用于 loop 侧判断空转）。 */
export function isNearDuplicate(a: string, b: string, threshold = 0.72): boolean {
  const x = normalizeLine(a)
  const y = normalizeLine(b)
  if (!x || !y) return false
  if (x === y) return true
  const shorter = x.length <= y.length ? x : y
  const longer = x.length <= y.length ? y : x
  if (shorter.length < 12) return false
  if (longer.includes(shorter) && shorter.length / longer.length >= threshold) return true
  // 简单 bigram Jaccard
  const grams = (s: string) => {
    const g = new Set<string>()
    for (let i = 0; i < s.length - 1; i += 1) g.add(s.slice(i, i + 2))
    return g
  }
  const A = grams(x)
  const B = grams(y)
  let inter = 0
  for (const g of A) if (B.has(g)) inter += 1
  const union = A.size + B.size - inter || 1
  return inter / union >= threshold
}
