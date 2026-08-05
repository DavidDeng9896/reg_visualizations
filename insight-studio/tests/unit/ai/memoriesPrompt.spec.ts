import { describe, expect, it } from 'vitest'
import { buildMemoriesPrompt } from '../../../src/modules/ai/prompts'

describe('buildMemoriesPrompt', () => {
  it('空列表返回空串', () => {
    expect(buildMemoriesPrompt([])).toBe('')
  })

  it('注入必须遵守的记忆块', () => {
    const p = buildMemoriesPrompt([{ content: '先聚合再柱状图' }, { content: '勿用散点做类别对比' }])
    expect(p).toContain('用户分析记忆（必须遵守）')
    expect(p).toContain('- 先聚合再柱状图')
    expect(p).toContain('- 勿用散点做类别对比')
  })
})
