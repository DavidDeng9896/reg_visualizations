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

  it('returns svg and caches', async () => {
    const mol = { get_svg: () => '<svg>ok</svg>', delete: vi.fn() }
    get_mol.mockReturnValue(mol)
    const a = await renderStructureSvg('CCO', { width: 100, height: 80 })
    const b = await renderStructureSvg('CCO', { width: 100, height: 80 })
    expect(a).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(b).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(get_mol).toHaveBeenCalledTimes(1)
    expect(mol.delete).toHaveBeenCalled()
  })

  it('invalid mol → ok:false', async () => {
    get_mol.mockReturnValue(null)
    const r = await renderStructureSvg('%%%')
    expect(r.ok).toBe(false)
  })
})
