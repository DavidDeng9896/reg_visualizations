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
 * MiniMax 等模型常把推理塞进 content 的 `<think>…</think>`（而非 reasoning_content）。
 * 同步剥离未闭合尾部（流式半截块），避免泄漏到用户可见正文。
 */
const THINK_BLOCK_RE =
  /<\s*(?:think|thinking|reason|reasoning)\s*>[\s\S]*?<\s*\/\s*(?:think|thinking|reason|reasoning)\s*>/gi
const THINK_OPEN_TAIL_RE = /<\s*(?:think|thinking|reason|reasoning)\s*>[\s\S]*$/i
const THINK_TAG_STRIP_RE = /<\/?\s*(?:think|thinking|reason|reasoning)\s*>/gi

export type ExtractThinkOptions = {
  /** 流式中间态勿 trim，避免 visible 前缀回缩导致 token 丢字。默认 true。 */
  trim?: boolean
}

/** 剥离 think 泄漏；thinking 可映射到 ReasoningCard / debug，绝不可进用户气泡。 */
export function extractThinkLeakage(
  text: string,
  opts?: ExtractThinkOptions,
): { visible: string; thinking: string } {
  const doTrim = opts?.trim !== false
  const chunks: string[] = []
  let visible = String(text ?? '').replace(THINK_BLOCK_RE, (block) => {
    const inner = block.replace(THINK_TAG_STRIP_RE, '').trim()
    if (inner) chunks.push(inner)
    return '\n'
  })
  visible = visible.replace(THINK_OPEN_TAIL_RE, (block) => {
    const inner = block.replace(/<\s*(?:think|thinking|reason|reasoning)\s*>/i, '').trim()
    if (inner) chunks.push(inner)
    return ''
  })
  visible = visible.replace(/\n{3,}/g, '\n\n')
  if (doTrim) visible = visible.trim()
  return { visible, thinking: chunks.join('\n\n').trim() }
}

/** 仅剥离 think 标签（不做复读折叠）。气泡与回灌历史共用。 */
export function scrubThinkTags(text: string): string {
  return extractThinkLeakage(text).visible
}

/** 用户可见气泡正文：零 think 标签。 */
export function assistantBubbleText(text: string): string {
  return scrubThinkTags(text)
}

/**
 * 可见回复去重：折叠连续高度相似的短句/段落，抑制 agent 复读墙。
 */
const FILLER_LINE =
  /^(好的?[，,.。！!\s]*)?(让我|我来|开始执行|先确认|直接调用|直接执行|开始创建|完全停止|先读取|系统提示明确)/

/** 过程独白 / 读技能纠结：无工具时计为 stall，即使与上一轮不完全相同。 */
export function isProcessMonologue(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return false
  if (FILLER_LINE.test(t)) return true
  if (/完全停止|先读取.{0,12}技能|读取图表.{0,8}技能|不要输出过程|set_chart_config 一直失败/.test(t)) {
    return true
  }
  // 同一句「让我读取」重复出现 ≥3
  const hits = t.match(/读取.{0,20}技能|完全停止/g)
  return !!hits && hits.length >= 2
}

/** 规范化一行便于比较。 */
export function normalizeLine(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/[：:。.!！?？,，、；;]+$/g, '')
}

const FENCE_PLACEHOLDER = /@@FENCE_(\d+)@@/g
const FENCE_BLOCK = /```[^\n]*\r?\n[\s\S]*?(?:```|$)/g

/** 未加围栏的 Python / Custom Code：行级去重会砍掉合法重复语句。 */
function looksLikePythonSource(s: string): boolean {
  if (/\bdef\s+custom_code\s*\(/.test(s)) return true
  const lines = s.split(/\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 12) return false
  let hits = 0
  for (const l of lines) {
    if (
      /^(import\s+|from\s+\S+\s+import|def\s+|class\s+|if\s+|elif\s+|else:|for\s+|while\s+|return\s+|try:|except\b|with\s+|@|#\s*=+|print\()/.test(
        l,
      )
    ) {
      hits += 1
    }
  }
  return hits / lines.length >= 0.45
}

/**
 * 去掉连续重复段落与「好，让我直接…」类填充句堆叠。
 * 保留首个出现；若全文几乎全是同一句循环，压成一句并加省略说明。
 * 代码围栏与 Custom Code 源码整段保留，避免长脚本被当成复读墙截断。
 */
export function scrubVisibleContent(text: string, opts?: { maxLines?: number }): string {
  const { visible } = extractThinkLeakage(text)
  const raw = visible.trim()
  if (!raw) return ''
  const fences: string[] = []
  const masked = raw.replace(FENCE_BLOCK, (block) => {
    fences.push(block)
    return `\n\n@@FENCE_${fences.length - 1}@@\n\n`
  })
  if (fences.length === 0 && looksLikePythonSource(raw)) return raw

  const maxLines = opts?.maxLines ?? 40
  const scrubbed = scrubProse(masked, maxLines)
  return scrubbed.replace(FENCE_PLACEHOLDER, (_, n) => fences[Number(n)] ?? '')
}

function scrubProse(raw: string, maxLines: number): string {
  const parts = raw.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) {
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
    if (/^@@FENCE_\d+@@$/.test(p)) {
      out.push(p)
      continue
    }
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
