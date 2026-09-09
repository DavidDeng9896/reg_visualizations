import { describe, expect, it } from 'vitest'
import { makeOnEvent, type UiMessage } from '../../../src/modules/ai/aiStore'

function blankAssistant(): UiMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content: '',
    trace: [],
    artifacts: [],
    at: Date.now(),
  }
}

describe('makeOnEvent contentScrub (P0-1)', () => {
  it('流式 token 含 <think> 时气泡 content 不含标签，thinking 进 reasoning', () => {
    const assistant = blankAssistant()
    const onEvent = makeOnEvent(assistant, () => undefined)
    onEvent({ type: 'round', n: 1 })
    onEvent({ type: 'token', text: '前言\n' })
    onEvent({ type: 'token', text: '<think>\n秘密推理\n</think>\n' })
    onEvent({ type: 'token', text: '可见答案' })
    expect(assistant.content).toContain('前言')
    expect(assistant.content).toContain('可见答案')
    expect(assistant.content).not.toMatch(/<\/?think>/i)
    expect(assistant.reasoning ?? '').toContain('秘密推理')
  })

  it('流式未闭合 <think> 尾部不进入 content', () => {
    const assistant = blankAssistant()
    const onEvent = makeOnEvent(assistant, () => undefined)
    onEvent({ type: 'round', n: 1 })
    onEvent({ type: 'token', text: 'OK\n<think>\n还在想' })
    expect(assistant.content).toBe('OK')
    expect(assistant.content).not.toContain('还在想')
    expect(assistant.reasoning ?? '').toContain('还在想')
  })

  it('done 再次 scrub，并把 think 并入 reasoning', () => {
    const assistant = blankAssistant()
    const onEvent = makeOnEvent(assistant, () => undefined)
    onEvent({ type: 'round', n: 1 })
    onEvent({
      type: 'done',
      content: '总结\n\n<think>\n内部\n</think>\n\n完成。',
    })
    expect(assistant.content).not.toMatch(/<\/?think>/i)
    expect(assistant.content).toContain('总结')
    expect(assistant.content).toContain('完成')
    expect(assistant.reasoning ?? '').toContain('内部')
  })
})
