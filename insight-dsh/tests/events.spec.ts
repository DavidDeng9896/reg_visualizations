import { describe, expect, it } from 'vitest'
import { detectMockScenario } from '../src/mockAgent.ts'
import { sessionEventToAgentEvents } from '../src/events.ts'
import { shouldDisableThinking } from '../src/providerPolicy.ts'

describe('detectMockScenario', () => {
  it('maps e2e prompts to scenarios', () => {
    expect(detectMockScenario('把 Weight-length study 画成散点图并加线性拟合')).toBe('scatter')
    expect(detectMockScenario('删除 Iris measurements 表')).toBe('delete')
    expect(detectMockScenario('帮我给当前表配一个散点图')).toBe('ask')
    expect(detectMockScenario('把 hits 与 meta 做成过滤+Join 管道并出图放到看板')).toBe('pipeline')
    expect(detectMockScenario('先看表再收尾')).toBe('quota')
    expect(detectMockScenario('看表再出图')).toBe('abort')
  })

  it('reuses previous scenario on continue', () => {
    expect(detectMockScenario('【续跑检查点】从断点继续', 'quota')).toBe('quota')
    expect(detectMockScenario('【续跑检查点】从断点继续', 'abort')).toBe('abort')
  })
})

describe('sessionEventToAgentEvents extras', () => {
  it('maps reasoning chunks', () => {
    const evs = sessionEventToAgentEvents({ type: 'assistant/chunk', reasoning: '想一下' })
    expect(evs).toEqual([{ type: 'reasoning', text: '想一下' }])
  })

  it('does not emit done on turn/end', () => {
    expect(sessionEventToAgentEvents({ type: 'turn/end', content: 'hi' })).toEqual([])
  })
})

describe('shouldDisableThinking', () => {
  it('disables thinking on Aliyun compatible gateways', () => {
    expect(shouldDisableThinking('https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1')).toBe(true)
    expect(shouldDisableThinking('https://api.deepseek.com')).toBe(false)
    expect(shouldDisableThinking('https://dashscope.aliyuncs.com/compatible-mode/v1', 'enabled')).toBe(false)
  })
})
