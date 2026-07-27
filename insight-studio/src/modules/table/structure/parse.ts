/**
 * 轻量启发式：不调用 RDKit。用于导入推断。
 * SMILES 判定刻意偏严，减少把普通英文/标识符误判为结构。
 */

const SMILES_CHARSET_RE = /^[A-Za-z0-9@+\-\[\]\(\)=#$:/\\.%>~*]+$/

/** 无括号的有机子集原子（Daylight organic subset + 芳香小写）。 */
const ORGANIC_TWO = ['Cl', 'Br'] as const
const ORGANIC_ONE = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'I', '*', 'b', 'c', 'n', 'o', 'p', 's'])

export function looksLikeMol(text: string): boolean {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return false
  if (/M\s+END\s*$/im.test(t)) return true
  if (/V2000|V3000/i.test(t) && /\n/.test(t)) return true
  return false
}

function balanced(s: string, open: string, close: string): boolean {
  let depth = 0
  for (const ch of s) {
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth < 0) return false
    }
  }
  return depth === 0
}

/**
 * 整串是否仅为有机子集原子拼接（如 CCO、ClC、c1 不行——含数字走特征路径）。
 * 「hello」「Sample」「aspirin」会在此失败。
 */
function isOrganicSubsetAtomChain(s: string): boolean {
  let i = 0
  let atoms = 0
  while (i < s.length) {
    if (s.startsWith('Cl', i) || s.startsWith('Br', i)) {
      i += 2
      atoms++
      continue
    }
    const ch = s[i]!
    if (ORGANIC_ONE.has(ch)) {
      i++
      atoms++
      continue
    }
    return false
  }
  return atoms >= 1 && atoms <= 64
}

/** 大写有机子集 / 卤素（不含 H，避免英文干扰）。 */
function hasOrganicUpperAtom(s: string): boolean {
  return /Cl|Br|[BCNOFPSI]/.test(s)
}

function aromaticAtomCount(s: string): number {
  return (s.match(/[bcnops]/g) ?? []).length
}

/**
 * SMILES 候选（偏严）：
 * 1. 纯有机子集原子链（CCO、CCN、ClC…）
 * 2. 或同时具备化学原子 + 结构特征（环号 / 键 / 支链 / 方括号 / 立体）
 */
export function looksLikeSmiles(text: string): boolean {
  const s = text.trim()
  if (!s || /\s/.test(s)) return false
  if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return false
  if (/^InChI=/i.test(s)) return false
  if (s.length > 5000) return false
  if (!SMILES_CHARSET_RE.test(s)) return false
  if (!balanced(s, '(', ')') || !balanced(s, '[', ']')) return false

  // 路径 A：整串只是原子链（无环号/键/括号）
  if (isOrganicSubsetAtomChain(s)) {
    if (s.length === 1) return /^[CNOPSFIB]$/i.test(s)
    return true
  }

  // 路径 B：必须有明确结构特征
  const hasRing = /\d/.test(s)
  const hasBond = /[=#:]/.test(s)
  const hasBranch = /[()]/.test(s)
  const hasBracket = /\[/.test(s)
  const hasStereo = /[@\\/]/.test(s)
  if (!(hasRing || hasBond || hasBranch || hasBracket || hasStereo)) return false

  const upper = hasOrganicUpperAtom(s)
  const arom = aromaticAtomCount(s)
  const aromRing = /[bcnops]\d/.test(s)

  if (upper) {
    // 有大写有机原子即可（如 CC(=O)O、C1CCCCC1）
  } else if (aromRing && arom >= 2) {
    // 芳香环：至少两个芳香原子（c1ccccc1），拒绝 hello1
  } else if (aromRing && (hasBond || hasBranch || hasBracket)) {
    // 单芳香原子但有键/支链
  } else {
    return false
  }

  // 拒绝「几乎全是元音的词 + 点缀符号」类噪声
  const letters = s.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 5) {
    const vowels = (letters.match(/[aeiouyAEIOUY]/g) ?? []).length
    if (vowels / letters.length >= 0.55 && !hasBond && !hasBranch && !hasBracket && !(aromRing && arom >= 2)) {
      return false
    }
  }

  return true
}

export function isStructureCandidate(text: string): boolean {
  return looksLikeMol(text) || looksLikeSmiles(text)
}

/** 列名暗示结构列时，可降低推断阈值（供 csv 推断使用）。 */
export function columnNameSuggestsStructure(name: string): boolean {
  return /smiles|canonical.?smiles|mol(?:ecule|block)?|structure|chem(?:ical)?.?struct/i.test(name.trim())
}
