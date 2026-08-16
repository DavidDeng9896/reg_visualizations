import { describe, expect, it } from 'vitest'
import { detectMockScenario } from '../src/mockAgent.ts'
import { sessionEventToAgentEvents } from '../src/events.ts'
import { shouldDisableThinking } from '../src/providerPolicy.ts'
import { jsonSchemaToDshParams, toLosslessJson } from '../src/dshParams.ts'
import { TOOL_DEFS } from '../../insight-studio/src/modules/ai/tools/registry'
import { defineTool } from '@deepseek-ai/dsh-tools'

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

  it('emits error on failed LLM turn', () => {
    expect(
      sessionEventToAgentEvents({
        type: 'turn/end',
        data: { reason: { kind: 'error', error: { message: 'DeepSeek API error (HTTP 400)', status: 400 } } },
      }),
    ).toEqual([{ type: 'error', message: 'DeepSeek API error (HTTP 400)' }])
  })
})

describe('jsonSchemaToDshParams', () => {
  it('omits undefined descriptions so dsh-tools accepts join keys', () => {
    const join = TOOL_DEFS.find((t) => t.name === 'add_join_step')
    expect(join).toBeTruthy()
    const params = jsonSchemaToDshParams(join!.parameters as never)
    expect(params.keys.type).toBe('array')
    expect(params.keys.description).toBeUndefined()
    expect(() =>
      defineTool({
        name: 'add_join_step',
        description: join!.description,
        parameters: params,
        output: { schema: { type: 'json' }, render: () => [] },
        async execute() {
          return {}
        },
      }),
    ).not.toThrow()
  })

  it('registers every platform tool schema', () => {
    for (const def of TOOL_DEFS) {
      if (def.name.startsWith('delegate_') || def.name === 'ask_user' || def.name === 'submit_plan' || def.name === 'mark_step_done') {
        continue
      }
      expect(() =>
        defineTool({
          name: def.name,
          description: def.description,
          parameters: jsonSchemaToDshParams(def.parameters as never),
          output: { schema: { type: 'json' }, render: () => [] },
          async execute() {
            return {}
          },
        }),
      ).not.toThrow()
    }
  })

  it('strips undefined so tool output is lossless JSON', () => {
    expect(toLosslessJson({ ok: true, summary: 'hi', artifact: undefined })).toEqual({ ok: true, summary: 'hi' })
  })
})

describe('shouldDisableThinking', () => {
  it('disables thinking on Aliyun compatible gateways', () => {
    expect(shouldDisableThinking('https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1')).toBe(true)
    expect(shouldDisableThinking('https://api.deepseek.com')).toBe(false)
    expect(shouldDisableThinking('https://dashscope.aliyuncs.com/compatible-mode/v1', 'enabled')).toBe(false)
  })
})
