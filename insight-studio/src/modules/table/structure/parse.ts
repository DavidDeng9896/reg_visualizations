/** 轻量启发式：不调用 RDKit。用于导入推断与候选探测。 */

const SMILES_RE = /^[A-Za-z0-9@+\-\[\]\(\)=#$:/\\.%>~]+$/

export function looksLikeMol(text: string): boolean {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return false
  if (/M\s+END\s*$/im.test(t)) return true
  if (/V2000|V3000/i.test(t) && /\n/.test(t)) return true
  return false
}

export function looksLikeSmiles(text: string): boolean {
  const s = text.trim()
  if (!s || /\s/.test(s)) return false
  if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return false
  if (!SMILES_RE.test(s)) return false
  // 至少含一个字母（元素符号）；纯符号串排除
  if (!/[A-Za-z]/.test(s)) return false
  // 过短且无环/键标记的单字母留给普通文本（除常见元素单原子如 C、N、O、Cl 用长度>=2 或含括号/键）
  if (s.length === 1) return /^[CNOPSFIB]$/i.test(s)
  return true
}

export function isStructureCandidate(text: string): boolean {
  return looksLikeMol(text) || looksLikeSmiles(text)
}
