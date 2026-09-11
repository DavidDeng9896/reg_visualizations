import { beforeEach, describe, expect, it } from 'vitest'
import { computed, nextTick, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { createEmptyAnalysis } from '../../../src/shared/factories'
import { createStepNode } from '../../../src/modules/steps/factory'
import { readReportConfig } from '../../../src/modules/steps/report/reportModel'
import { createReportAiToolExecutor } from '../../../src/modules/ai/reportAiStore'
import type { ToolCall } from '../../../src/modules/ai/client'
import ReportPanel from '../../../src/modules/steps/panel/ReportPanel.vue'

function toolCall(name: string): ToolCall {
  return {
    id: `call-${name}`,
    type: 'function',
    function: { name, arguments: '{}' },
  }
}

function seedReportStep(title: string, body: string) {
  const store = useAnalysisStore()
  const a = createEmptyAnalysis('t')
  const step = createStepNode('report', 'R')
  step.config.report = {
    title,
    theme: 'research',
    templateId: 'research',
    generatedAt: '2026-01-01T00:00:00.000Z',
    sections: [{ id: 's1', kind: 'paragraph', title: 'A', body }],
    conclusion: '',
  }
  a.steps.push(step)
  store.$patch({ current: a, dirty: false })
  return { store, step }
}

describe('report preview reactivity after update_report_step', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('computed(reportDoc) from live step updates after executor mutate', async () => {
    const { step } = seedReportStep('OLD', 'old body')
    const store = useAnalysisStore()

    const liveStep = computed(() => store.current!.steps.find((s) => s.id === step.id)!)
    const reportDoc = computed(() => {
      void store.current?.revision
      return readReportConfig(liveStep.value.config as Record<string, unknown>)
    })

    const titles: string[] = []
    watch(reportDoc, (v) => titles.push(v.title), { immediate: true })
    expect(reportDoc.value.title).toBe('OLD')

    const exec = createReportAiToolExecutor(step.id)
    const res = await exec(toolCall('update_report_step'), {
      stepId: step.id,
      report: {
        title: 'NEW TITLE',
        theme: 'research',
        templateId: 'research',
        sections: [{ id: 's2', kind: 'paragraph', title: 'B', body: 'new body from AI' }],
        conclusion: 'done',
      },
    })
    expect(res.ok, res.summary).toBe(true)
    await flushPromises()
    await nextTick()

    expect(reportDoc.value.title).toBe('NEW TITLE')
    expect(reportDoc.value.sections[0]!.body).toBe('new body from AI')
    expect(titles).toContain('NEW TITLE')
  })

  it('ReportPanel preview updates after update_report_step even with detached step prop', async () => {
    const pinia = getActivePinia()!
    const { store, step } = seedReportStep('OLD DETACHED', 'old body')

    // Detached snapshot — parent that cloned step into props (stale local copy)
    const detached = JSON.parse(JSON.stringify(store.current!.steps.find((s) => s.id === step.id)!))
    const w = mount(ReportPanel, {
      props: { step: detached },
      global: { plugins: [pinia] },
    })

    expect(w.text()).toContain('OLD DETACHED')
    expect(w.text()).toContain('old body')

    const exec = createReportAiToolExecutor(step.id)
    const res = await exec(toolCall('update_report_step'), {
      stepId: step.id,
      report: {
        title: 'NEW DETACHED',
        theme: 'research',
        templateId: 'research',
        sections: [{ id: 's2', kind: 'paragraph', title: 'B', body: 'ai wrote this section' }],
        conclusion: 'conclusion text',
      },
    })
    expect(res.ok, res.summary).toBe(true)
    await flushPromises()
    await nextTick()

    expect(
      (store.current!.steps.find((s) => s.id === step.id)!.config.report as { title: string }).title,
    ).toBe('NEW DETACHED')
    expect(w.text()).toContain('NEW DETACHED')
    expect(w.text()).toContain('ai wrote this section')
    expect(w.text()).toContain('conclusion text')
    expect(w.text()).not.toContain('OLD DETACHED')
    w.unmount()
  })

  it('ReportPanel preview updates when prop is the live store step', async () => {
    const pinia = getActivePinia()!
    const { step } = seedReportStep('OLD PANEL', 'old body')
    const store = useAnalysisStore()
    const liveStep = store.current!.steps.find((s) => s.id === step.id)!

    const w = mount(ReportPanel, {
      props: { step: liveStep },
      global: { plugins: [pinia] },
    })

    expect(w.text()).toContain('OLD PANEL')

    const exec = createReportAiToolExecutor(step.id)
    const res = await exec(toolCall('update_report_step'), {
      stepId: step.id,
      report: {
        title: 'NEW PANEL',
        theme: 'research',
        templateId: 'research',
        sections: [{ id: 's2', kind: 'paragraph', title: 'B', body: 'live prop body' }],
        conclusion: 'ok',
      },
    })
    expect(res.ok, res.summary).toBe(true)
    await flushPromises()
    await nextTick()

    expect(w.text()).toContain('NEW PANEL')
    expect(w.text()).toContain('live prop body')
    w.unmount()
  })
})
