import { describe, expect, it } from 'vitest'
import { normalizeAnalysis } from '../../src/shared/normalizeAnalysis'
import type { Analysis } from '../../src/shared/types'

describe('normalizeAnalysis', () => {
  it('补齐缺失 revision / files', () => {
    const raw = {
      id: 'a',
      name: 'n',
      createdAt: 't',
      updatedAt: 't',
      tables: [],
      flowchartLayout: {},
      steps: [],
    } as unknown as Analysis
    const a = normalizeAnalysis(raw)
    expect(a.revision).toBe(0)
    expect(a.files).toEqual([])
  })
})
