import { beforeEach, describe, expect, it, vi } from 'vitest'

const get_mol = vi.fn()
vi.mock('../../../src/modules/table/structure/rdkit', () => ({
  ensureRdkit: vi.fn(async () => ({ get_mol })),
}))

import { invalidateStructureCache, renderStructureSvg } from '../../../src/modules/table/structure/render'

describe('renderStructureSvg', () => {
  beforeEach(() => {
    invalidateStructureCache()
    get_mol.mockReset()
  })

  it('returns svg and caches (uses get_svg_with_highlights when available)', async () => {
    const mol = {
      get_svg: vi.fn(() => '<svg>fallback</svg>'),
      get_svg_with_highlights: vi.fn(() => '<svg>ok</svg>'),
      delete: vi.fn(),
    }
    get_mol.mockReturnValue(mol)
    const a = await renderStructureSvg('CCO', { width: 160, height: 128 })
    const b = await renderStructureSvg('CCO', { width: 160, height: 128 })
    expect(a).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(b).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(get_mol).toHaveBeenCalledTimes(1)
    expect(mol.get_svg_with_highlights).toHaveBeenCalledTimes(1)
    const passed = mol.get_svg_with_highlights.mock.calls.map((c: unknown[]) => c[0])[0]
    expect(typeof passed).toBe('string')
    const details = JSON.parse(passed as string) as {
      bondLineWidth: number
      width: number
      height: number
      padding: number
    }
    expect(details.bondLineWidth).toBe(1)
    expect(details.width).toBe(160)
    expect(details.height).toBe(128)
    expect(details.padding).toBe(0.02)
    expect(mol.delete).toHaveBeenCalled()
  })

  it('falls back to get_svg when highlights API missing', async () => {
    const mol = { get_svg: vi.fn(() => '<svg>plain</svg>'), delete: vi.fn() }
    get_mol.mockReturnValue(mol)
    const r = await renderStructureSvg('CCO', { width: 100, height: 80 })
    expect(r).toEqual({ ok: true, svg: '<svg>plain</svg>' })
    expect(mol.get_svg).toHaveBeenCalledWith(100, 80)
  })

  it('invalid mol → ok:false', async () => {
    get_mol.mockReturnValue(null)
    const r = await renderStructureSvg('%%%')
    expect(r.ok).toBe(false)
  })
})
