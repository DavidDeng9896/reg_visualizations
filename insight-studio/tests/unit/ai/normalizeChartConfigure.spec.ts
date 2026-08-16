import { describe, expect, it } from 'vitest'
import {
  normalizeAiChartConfigure,
  autofillRequiredChartSlots,
  resolveColumnField,
  resolveConfigureFields,
  formatChartMappingFailHint,
} from '../../../src/modules/ai/normalizeChartConfigure'
import { capReasoningText, isProcessMonologue } from '../../../src/modules/ai/contentScrub'
import type { ColumnMeta } from '../../../src/shared/types'

const cols: ColumnMeta[] = [
  { field: 'clone_id', title: 'Clone', dataType: 'string' },
  { field: 'KD_nM', title: 'KD', dataType: 'number' },
  { field: 'Expression_mg_L', title: 'Expression', dataType: 'number' },
  { field: 'parent', title: 'Parent', dataType: 'string' },
]

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

  it('bar：y 写成数组 + aggregate 别名可规范化', () => {
    const out = normalizeAiChartConfigure('bar', {
      x: { field: 'Pur_No' },
      y: [{ field: 'EC50', aggregate: 'sum' }] as unknown as { field: string },
    })
    expect(out.y?.field).toBe('EC50')
    expect(out.y?.aggregation).toBe('sum')
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

describe('autofillRequiredChartSlots', () => {
  it('scatter 只传 values 时自动补 x', () => {
    const { configure, filled } = autofillRequiredChartSlots(
      'scatter',
      { values: [{ field: 'Expression_mg_L' }] },
      cols,
    )
    expect(configure.values?.[0]?.field).toBe('Expression_mg_L')
    expect(configure.x?.field).toBe('KD_nM')
    expect(configure.x!.field).not.toBe('Expression_mg_L')
    expect(filled.some((f) => f.startsWith('x='))).toBe(true)
  })

  it('scatter 缺槽时 x/values 都走数值列，不用 clone_id', () => {
    const { configure } = autofillRequiredChartSlots('scatter', {}, cols)
    expect(configure.values?.[0]?.field).toBe('KD_nM')
    expect(configure.x?.field).toBe('Expression_mg_L')
  })

  it('bar 缺 x 时优先选 clone/parent 类字符串列', () => {
    const { configure } = autofillRequiredChartSlots('bar', {}, cols)
    expect(configure.x?.field).toMatch(/clone_id|parent/)
  })

  it('字段名大小写模糊匹配', () => {
    expect(resolveColumnField('expression_mg_l', cols)).toBe('Expression_mg_L')
    const resolved = resolveConfigureFields({ values: [{ field: 'kd_nm' }] }, cols)
    expect(resolved.values?.[0]?.field).toBe('KD_nM')
  })

  it('失败提示包含可用列与示例 configure', () => {
    const hint = formatChartMappingFailHint(
      'scatter',
      cols,
      [{ slot: 'x', kind: 'required', message: 'X Axis 为必填项' }],
      { values: [{ field: 'Expression_mg_L' }] },
    )
    expect(hint).toContain('Expression_mg_L')
    expect(hint).toContain('configure')
    expect(hint).toContain('X Axis')
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

describe('isProcessMonologue', () => {
  it('识别读技能/完全停止类独白', () => {
    expect(isProcessMonologue('完全停止。我需要先读取图表最佳实践技能。')).toBe(true)
    expect(isProcessMonologue('让我读取该技能以获取确切的参数格式。')).toBe(true)
    expect(isProcessMonologue('已完成：Top 3 候选为 A/B/C。')).toBe(false)
  })
})
