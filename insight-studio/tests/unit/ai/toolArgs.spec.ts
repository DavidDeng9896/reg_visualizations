import { describe, expect, it } from 'vitest'
import { normalizeToolArguments } from '../../../src/modules/ai/client'
import { coerceArrayToolArgs, coerceParsedToolArgs } from '../../../src/modules/ai/toolArgs'

describe('toolArgs', () => {
  it('coerceArrayToolArgs：字段映射数组 → configure.values', () => {
    const arr = [{ field: 'koff_1e4' }]
    expect(coerceArrayToolArgs(arr, 'set_chart_config')).toEqual({
      configure: { values: [{ field: 'koff_1e4' }] },
    })
  })

  it('normalizeToolArguments：顶层数组不再原样回灌（避免 502）', () => {
    const raw = '[{"field":"koff_1e4"}]'
    const out = normalizeToolArguments(raw, 'set_chart_config')
    expect(() => JSON.parse(out)).not.toThrow()
    expect(JSON.parse(out)).toEqual({ configure: { values: [{ field: 'koff_1e4' }] } })
    expect(out.startsWith('[')).toBe(false)
  })

  it('coerceParsedToolArgs：steps 误传为 configure.values', () => {
    expect(
      coerceParsedToolArgs('set_chart_config', {
        viewId: 'v1',
        steps: [{ field: 'kd' }],
      }),
    ).toEqual({
      viewId: 'v1',
      configure: { values: [{ field: 'kd' }] },
    })
  })
})
