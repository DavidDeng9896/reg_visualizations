import { ensureRdkit } from './rdkit'

const CACHE_MAX = 500
const cache = new Map<string, string>()

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

export async function renderStructureSvg(
  text: string,
  opts?: { width?: number; height?: number },
): Promise<{ ok: true; svg: string } | { ok: false; error: string }> {
  const width = opts?.width ?? 100
  const height = opts?.height ?? 80
  const key = `${width}x${height}::${text}`

  const cached = cacheGet(key)
  if (cached !== undefined) {
    return { ok: true, svg: cached }
  }

  try {
    const rdkit = await ensureRdkit()
    const mol = rdkit.get_mol(text)
    if (!mol) {
      return { ok: false, error: 'invalid structure' }
    }
    try {
      const svg = mol.get_svg(width, height)
      cacheSet(key, svg)
      return { ok: true, svg }
    } finally {
      mol.delete()
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return { ok: false, error }
  }
}
