/**
 * 轻量 Markdown → HTML（助手消息）。
 * 连续正文行合并为同一段落（避免「一行一个 p」或无换行糊成一团时至少保留结构）。
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 去除 emoji/装饰符号（保留 → × 及 ⚠ ✓ ✗ 等有语义符号）。 */
export function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{269F}\u{26A2}-\u{26FF}\u{2700}-\u{2712}\u{2714}-\u{2716}\u{2718}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      '',
    )
    .replace(/[ \t]{2,}/g, ' ')
}

function inline(t: string): string {
  return t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function isTableSep(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line)
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line)
}

function isList(line: string): boolean {
  return /^\s*[-*] /.test(line) || /^\s*\d+\.\s+/.test(line)
}

function isHeading(line: string): boolean {
  return /^\s*#{1,4}\s+\S/.test(line)
}

function isFence(line: string): boolean {
  return line.trimStart().startsWith('```')
}

/** 轻量 markdown → html。 */
export function renderMd(src: string): string {
  const lines = escapeHtml(src).split('\n')
  const out: string[] = []
  let i = 0

  const flushPara = (buf: string[]) => {
    if (!buf.length) return
    const text = buf.map((l) => l.trim()).filter(Boolean).join(' ')
    if (text) out.push(`<p class="md-p">${inline(text)}</p>`)
    buf.length = 0
  }

  while (i < lines.length) {
    const raw = lines[i]

    if (isFence(raw)) {
      const buf: string[] = []
      i += 1
      while (i < lines.length && !isFence(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      out.push(`<pre class="md-pre"><code>${buf.join('\n')}</code></pre>`)
      continue
    }

    const line = stripEmoji(raw)

    if (!line.trim()) {
      i += 1
      continue
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i += 1
      }
      out.push(
        `<table class="md-table"><thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      )
      continue
    }

    if (isList(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag} class="md-${tag}">`)
      while (i < lines.length) {
        const L = stripEmoji(lines[i])
        if (ordered ? !/^\s*\d+\.\s+/.test(L) : !/^\s*[-*] /.test(L)) break
        const item = L.replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*] /, '')
        out.push(`<li>${inline(item)}</li>`)
        i += 1
      }
      out.push(`</${tag}>`)
      continue
    }

    if (isHeading(line)) {
      const m = line.match(/^\s*(#{1,4})\s+(.*)$/)
      const level = Math.min(4, m?.[1].length ?? 2)
      const text = m?.[2] ?? line
      out.push(`<h${level} class="md-h md-h${level}">${inline(text)}</h${level}>`)
      i += 1
      continue
    }

    // 正文：连续非空、非结构行合并为一段
    const para: string[] = []
    while (i < lines.length) {
      const Lraw = lines[i]
      if (isFence(Lraw)) break
      const L = stripEmoji(Lraw)
      if (!L.trim()) {
        i += 1
        break
      }
      if (isHeading(L) || isList(L) || (isTableRow(L) && i + 1 < lines.length && isTableSep(lines[i + 1]))) break
      para.push(L)
      i += 1
    }
    flushPara(para)
  }

  return out.join('')
}
