import { describe, expect, it } from 'vitest'
import { createScientistAnalysis } from '../../src/shared/scientistSeed'

describe('scientistSeed', () => {
  it('生成五张领域表', () => {
    const a = createScientistAnalysis()
    const names = a.tables.map((t) => t.name)
    expect(names).toEqual([
      'ELISA binding screen',
      'SPR kinetics',
      'CHO fed-batch titer',
      'ADCC dose-response',
      'PDX tumor & body weight',
    ])
    expect(a.tables.every((t) => t.rows.length > 0)).toBe(true)
    expect(a.project).toBe('AB-DSC-01')
  })
})
