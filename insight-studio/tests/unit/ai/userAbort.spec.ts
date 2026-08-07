import { describe, expect, it } from 'vitest'
import { applyUserAbortToMessages, clearTransientProgress } from '../../../src/modules/ai/userAbort'

describe('applyUserAbortToMessages', () => {
  it('关闭继续任务检查点并立刻停掉 streaming / 转圈 / 进行中工具', () => {
    const messages = [
      {
        role: 'assistant',
        streaming: true,
        planSteps: ['a', 'b'],
        planDone: [0],
        incomplete: true,
        planDismissed: false,
        trace: [
          { id: '1', name: 't1', running: true, summary: '' },
          {
            id: '2',
            name: 't2',
            running: false,
            summary: 'NEEDS_CONFIRMATION: x',
            needsConfirmation: true,
          },
        ],
      },
    ]
    applyUserAbortToMessages(messages)
    expect(messages[0].streaming).toBe(false)
    expect(messages[0].planDismissed).toBe(true)
    expect(messages[0].incomplete).toBe(false)
    expect(messages[0].trace[0].running).toBe(false)
    expect(messages[0].trace[0].ok).toBe(false)
    expect(messages[0].trace[0].summary).toBe('已中止')
    expect(messages[0].trace[1].rejected).toBe(true)
    expect(messages[0].trace[1].needsConfirmation).toBe(false)
  })
})

describe('clearTransientProgress', () => {
  it('仅清 streaming/running，不影响计划检查点', () => {
    const messages = [
      {
        role: 'assistant',
        streaming: true,
        incomplete: true,
        planSteps: ['a'],
        planDismissed: false,
        trace: [{ id: '1', name: 't', running: true, summary: 'ok' }],
      },
    ]
    clearTransientProgress(messages)
    expect(messages[0].streaming).toBe(false)
    expect(messages[0].trace[0].running).toBe(false)
    expect(messages[0].incomplete).toBe(true)
    expect(messages[0].planDismissed).toBe(false)
  })
})
