import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDemoAnalysis } from '../../../src/shared/seed'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { execTool } from '../../../src/modules/ai/tools/impl'
import {
  REPORT_AI_ALLOWED_TOOLS,
  createReportAiToolExecutor,
} from '../../../src/modules/ai/reportAiStore'
import type { ToolCall } from '../../../src/modules/ai/client'

const ctx = { confirmDestructive: true, confirmWrite: false }

function toolCall(name: string): ToolCall {
  return {
    id: `call-${name}`,
    type: 'function',
    function: { name, arguments: '{}' },
  }
}

async function seedStore() {
  const store = useAnalysisStore()
  const a = createDemoAnalysis()
  store.$patch((state) => {
    state.current = a
    state.dirty = false
    state.selected = null
    state.mode = 'workspace'
  })
  return { store, analysis: a }
}

describe('reportAiStore tool whitelist', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('allowed tools exclude create_report_step and dangerous ops', () => {
    expect(REPORT_AI_ALLOWED_TOOLS).toContain('update_report_step')
    expect(REPORT_AI_ALLOWED_TOOLS).toContain('list_skills')
    expect(REPORT_AI_ALLOWED_TOOLS).toContain('read_skill')
    expect(REPORT_AI_ALLOWED_TOOLS).not.toContain('create_report_step')
    expect(REPORT_AI_ALLOWED_TOOLS).not.toContain('run_python_code')
    expect(REPORT_AI_ALLOWED_TOOLS).not.toContain('delete_table')
  })

  it('FORBID create_report_step even if invoked on executor', async () => {
    await seedStore()
    const before = useAnalysisStore().current!.steps.filter((s) => s.type === 'report').length
    const exec = createReportAiToolExecutor('any-step')
    const res = await exec(toolCall('create_report_step'), {
      name: '应被拒绝',
      report: { title: 'x', theme: 'research', sections: [] },
    })
    expect(res.ok).toBe(false)
    expect(res.summary).toMatch(/FORBIDDEN|不允许|create_report_step/)
    expect(useAnalysisStore().current!.steps.filter((s) => s.type === 'report').length).toBe(before)
  })

  it('update_report_step applies only to the locked current stepId', async () => {
    await seedStore()
    const created = await execTool(
      'create_report_step',
      { name: '报告 A', report: { title: 'A', theme: 'research', sections: [] } },
      { ...ctx, wantReport: true },
    )
    expect(created.ok, created.summary).toBe(true)
    const stepA = String(created.artifact?.stepId)
    const createdB = await execTool(
      'create_report_step',
      { name: '报告 B', report: { title: 'B', theme: 'research', sections: [] } },
      { ...ctx, wantReport: true },
    )
    expect(createdB.ok, createdB.summary).toBe(true)
    const stepB = String(createdB.artifact?.stepId)

    const exec = createReportAiToolExecutor(stepA)
    const res = await exec(toolCall('update_report_step'), {
      stepId: stepB, // agent 试图改另一节点 → 必须锁回 stepA
      name: '已锁回 A',
      report: { title: 'A-updated', theme: 'research', sections: [] },
    })
    expect(res.ok, res.summary).toBe(true)

    const steps = useAnalysisStore().current!.steps
    const a = steps.find((s) => s.id === stepA)!
    const b = steps.find((s) => s.id === stepB)!
    expect(a.name).toBe('已锁回 A')
    expect((a.config.report as { title?: string }).title).toBe('A-updated')
    expect(b.name).toBe('报告 B')
    expect((b.config.report as { title?: string }).title).toBe('B')
  })

  it('done=true on update goes through reportQuality gate', async () => {
    await seedStore()
    const created = await execTool(
      'create_report_step',
      {
        name: '待洗报告',
        report: { title: 't', theme: 'research', sections: [], conclusion: '' },
      },
      { ...ctx, wantReport: true },
    )
    const stepId = String(created.artifact?.stepId)
    const exec = createReportAiToolExecutor(stepId)
    const res = await exec(toolCall('update_report_step'), {
      stepId,
      done: true,
      report: {
        title: '仍有占位',
        theme: 'research',
        sections: [],
        conclusion: '待完善，后续由 AI 改写。',
      },
    })
    expect(res.ok).toBe(false)
    expect(res.summary).toMatch(/质量门|占位|done|待完善|后续由/)
  })
})
