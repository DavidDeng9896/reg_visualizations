import { describe, expect, it } from 'vitest'
import { AUTO_COMPRESS_AT, CONTEXT_TOKEN_LIMIT, estimateChatTokens, estimateTokens, formatTokens, summarizeTurns } from '../../../src/modules/ai/tokens'

describe('tokens：上下文估算与压缩摘要', () => {
  it('CJK 1 字 ≈ 1 token，其余 ≈ 4 字符 1 token', () => {
    expect(estimateTokens('你好世界')).toBe(4)
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('你好ab')).toBe(3)
  })

  it('estimateChatTokens 累计消息并含结构开销', () => {
    const n = estimateChatTokens([
      { role: 'user', content: '你好世界' },
      { role: 'assistant', content: 'abcd' },
    ])
    expect(n).toBe(4 + 1 + 8)
  })

  it('formatTokens 千位缩写', () => {
    expect(formatTokens(999)).toBe('999')
    expect(formatTokens(1200)).toBe('1.2k')
    expect(formatTokens(128000)).toBe('128k')
  })

  it('自动压缩阈值 = 上限 80%', () => {
    expect(AUTO_COMPRESS_AT).toBe(Math.floor(CONTEXT_TOKEN_LIMIT * 0.8))
  })

  it('summarizeTurns：保留此前摘要 + 用户诉求 + 最近进展', () => {
    const s = summarizeTurns([
      { role: 'system', content: '【早前对话摘要（上下文已压缩）】\n用户此前的诉求：\n- 旧诉求' },
      { role: 'user', content: '画散点图' },
      { role: 'assistant', content: '已创建视图' },
      { role: 'user', content: '加拟合' },
    ])
    expect(s).toContain('旧诉求')
    expect(s).toContain('画散点图')
    expect(s).toContain('加拟合')
    expect(s).toContain('已创建视图')
    expect(s).toContain('上下文已压缩')
  })
})
