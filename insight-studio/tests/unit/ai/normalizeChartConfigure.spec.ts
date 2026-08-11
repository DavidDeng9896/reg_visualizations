import { describe, expect, it } from 'vitest'
import { normalizeAiChartConfigure } from '../../../src/modules/ai/normalizeChartConfigure'
import { capReasoningText } from '../../../src/modules/ai/contentScrub'

describe('normalizeAiChartConfigure', () => {
  it('scatter：y 提升为 values', () => {
    const out = normalizeAiChartConfigure('scatter', {
      x: { field: 'a' },
      y: { field: 'b' },
    })
    expect(out.values?.[0]?.field).toBe('b')
    expect(out.y).toBeUndefined()
  })

  it('bar：values[0] 回填 y', () => {
    const out = normalizeAiChartConfigure('bar', {
      x: { field: 'cat' },
      values: [{ field: 'metric' }],
    })
    expect(out.y?.field).toBe('metric')
  })

  it('字符串字段简写转为 mapping', () => {
    const out = normalizeAiChartConfigure('scatter', {
      x: 'weight' as unknown as { field: string },
      values: ['length'] as unknown as { field: string }[],
    })
    expect(out.x?.field).toBe('weight')
    expect(out.values?.[0]?.field).toBe('length')
  })
})

describe('capReasoningText', () => {
  it('短文本原样返回', () => {
    expect(capReasoningText('hello')).toBe('hello')
  })

  it('超长保留尾部并标注省略', () => {
    const long = '前缀'.repeat(2000) + '尾部标记'
    const out = capReasoningText(long, 40)
    expect(out.startsWith('…(前文思考已省略')).toBe(true)
    expect(out.endsWith('尾部标记') || out.includes('尾部标记')).toBe(true)
    expect(out.length).toBeLessThan(long.length)
  })
})
