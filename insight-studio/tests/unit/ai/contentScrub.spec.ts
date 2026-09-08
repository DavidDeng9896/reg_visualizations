import { describe, expect, it } from 'vitest'
import {
  scrubVisibleContent,
  isNearDuplicate,
  normalizeLine,
  extractThinkLeakage,
} from '../../../src/modules/ai/contentScrub'

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

  it('剥离 MiniMax <think>…</think> 泄漏', () => {
    const raw =
      '已导入成功。\n\n<think>\n表已成功导入并确认。\n</think>\n\n完成：doubled 表已产出。'
    const { visible, thinking } = extractThinkLeakage(raw)
    expect(visible).toContain('已导入成功')
    expect(visible).toContain('doubled')
    expect(visible).not.toMatch(/<\/?think>/i)
    expect(thinking).toContain('表已成功导入')
    expect(scrubVisibleContent(raw)).not.toMatch(/<\/?think>/i)
  })

  it('剥离未闭合 think 尾部（流式半截）', () => {
    const raw = '前言\n<think>\n还在想'
    const { visible, thinking } = extractThinkLeakage(raw)
    expect(visible).toBe('前言')
    expect(thinking).toContain('还在想')
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
})
