import { ensureRdkit } from './rdkit'
import { enqueueStructureJob } from './queue'

/** 表格缩略图默认尺寸。 */
export const STRUCTURE_THUMB_WIDTH = 160
export const STRUCTURE_THUMB_HEIGHT = 128
/** 浮层预览尺寸。 */
export const STRUCTURE_PREVIEW_WIDTH = 280
export const STRUCTURE_PREVIEW_HEIGHT = 220

const CACHE_MAX = 500
const cache = new Map<string, string>()

/** 紧凑边距 + 细键线（padding 越小分子越大）。 */
const DRAW_OPTS = {
  bondLineWidth: 1,
  multipleBondOffset: 0.12,
  padding: 0.02,
  minFontSize: 6,
  maxFontSize: 14,
}

function cacheGet(key: string): string | undefined {
  const val = cache.get(key)
  if (val !== undefined) {
    cache.delete(key)
    cache.set(key, val)
  }
  return val
}

function cacheSet(key: string, val: string) {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, val)
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

export function invalidateStructureCache(text?: string): void {
  if (text === undefined) {
    cache.clear()
    return
  }
  for (const key of [...cache.keys()]) {
    if (key.endsWith(`::${text}`)) cache.delete(key)
  }
}

function drawSvg(
  mol: { get_svg: (w: number, h: number) => string; get_svg_with_highlights?: (d: string) => string },
  width: number,
  height: number,
): string {
  if (typeof mol.get_svg_with_highlights === 'function') {
    return mol.get_svg_with_highlights(
      JSON.stringify({
        width,
        height,
        bondLineWidth: DRAW_OPTS.bondLineWidth,
        multipleBondOffset: DRAW_OPTS.multipleBondOffset,
        padding: DRAW_OPTS.padding,
        minFontSize: DRAW_OPTS.minFontSize,
        maxFontSize: DRAW_OPTS.maxFontSize,
      }),
    )
  }
  return mol.get_svg(width, height)
}

async function renderUncached(
  text: string,
  width: number,
  height: number,
): Promise<{ ok: true; svg: string } | { ok: false; error: string }> {
  try {
    const rdkit = await ensureRdkit()
    const mol = rdkit.get_mol(text)
    if (!mol) {
      return { ok: false, error: 'invalid structure' }
    }
    try {
      const svg = drawSvg(mol, width, height)
      return { ok: true, svg }
    } finally {
      mol.delete()
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return { ok: false, error }
  }
}

export async function renderStructureSvg(
  text: string,
  opts?: { width?: number; height?: number },
): Promise<{ ok: true; svg: string } | { ok: false; error: string }> {
  const width = opts?.width ?? STRUCTURE_THUMB_WIDTH
  const height = opts?.height ?? STRUCTURE_THUMB_HEIGHT
  // v4：更紧凑 padding
  const key = `v4:${width}x${height}::${text}`

  const cached = cacheGet(key)
  if (cached !== undefined) {
    return { ok: true, svg: cached }
  }

  const result = await enqueueStructureJob(() => renderUncached(text, width, height))
  if (result.ok) cacheSet(key, result.svg)
  return result
}
