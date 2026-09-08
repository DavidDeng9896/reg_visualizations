import { describe, expect, it } from 'vitest'
import { scrubVisibleContent, isNearDuplicate, normalizeLine } from '../../../src/modules/ai/contentScrub'

describe('contentScrub', () => {
  it('折叠连续重复段落', () => {
    const line = '好，让我直接调用 get_table_schema 确认表结构，然后创建视图。'
    const wall = Array.from({ length: 20 }, () => line).join('\n\n')
    const out = scrubVisibleContent(wall)
    expect(out).toContain(line)
    expect(out).toContain('省略')
    expect(out.split(line).length - 1).toBe(1)
  })

  it('保留不同内容的多段', () => {
    const out = scrubVisibleContent('已创建柱状图。\n\n已创建饼图。\n\n建议下一步检查映射。')
    expect(out).toContain('柱状图')
    expect(out).toContain('饼图')
    expect(out).not.toContain('省略')
  })

  it('isNearDuplicate 识别高度相似句', () => {
    expect(
      isNearDuplicate(
        '好，让我直接调用 get_table_schema 确认表结构，然后创建视图。',
        '好，让我直接调用 get_table_schema 确认表结构，然后创建视图',
      ),
    ).toBe(true)
    expect(isNearDuplicate('创建柱状图完成', '创建饼图完成')).toBe(false)
  })

  it('normalizeLine 去空白与末尾标点', () => {
    expect(normalizeLine('  你好。 ')).toBe('你好')
  })

  it('不截断未围栏的长 Custom Code（含重复 print 行）', () => {
    const body = [
      '修正了 Dunnett 的传参方式，代码完整验证通过。以下是完整最终代码：',
      '',
      'import pandas as pd',
      'import numpy as np',
      'import plotly.graph_objects as go',
      'from scipy import stats',
      'from statsmodels.stats.multicomp import pairwise_tukeyhsd',
      'import scikit_posthocs as sp',
      '',
      'def custom_code(inputs, **kwargs):',
      '    df = inputs[0].data.copy()',
      '    row0 = [str(v).strip() for v in df.iloc[0]]',
      '    waveforms = [w for w in row0 if w.lower() != "nan"]',
      '    print("识别波形组(保持原表顺序):", waveforms)',
    ]
    for (let i = 0; i < 50; i += 1) {
      body.push(`    print("step ${i}")`)
      body.push(`    x${i} = float(${i})`)
    }
    body.push('    return [{"name": "anova", "data": df}]')
    const raw = body.join('\n')
    const out = scrubVisibleContent(raw)
    expect(out).not.toContain('已省略')
    expect(out).toContain('def custom_code')
    expect(out).toContain('print("step 0")')
    expect(out).toContain('print("step 49")')
    expect(out).toContain('x49 = float(49)')
    expect(out).toContain('return [{"name": "anova", "data": df}]')
  })

  it('围栏内 Python 超过 40 行也不截断', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `    y${i} = ${i}`)
    const raw = [
      '好的，下面给出完整代码。',
      '```python',
      'def custom_code(inputs, **kwargs):',
      ...lines,
      '    return [{"name": "out", "data": inputs[0].data}]',
      '```',
    ].join('\n')
    const out = scrubVisibleContent(raw)
    expect(out).not.toContain('已省略')
    expect(out).toContain('y0 = 0')
    expect(out).toContain('y59 = 59')
    expect(out).toContain('```python')
  })
})
