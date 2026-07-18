/** Flowchart empty-state copy / landmark / CTA a11y (Round 29–52). */

import { workspaceEmptyCtaFocusFallback } from '@/modules/table/workspaceEmpty'

export const FLOW_EMPTY_REGION_LABEL = '流程图引导'

/** Selector for the CSV CTA inside the flowchart empty region. */
export const FLOW_EMPTY_CSV_CTA_SELECTOR = '[aria-label="从流程图空态导入 CSV"]'

/** Selector for the Combine CTA inside the flowchart empty region. */
export const FLOW_EMPTY_COMBINE_CTA_SELECTOR = '[aria-label="从流程图空态合并表"]'

export function flowchartEmptyRegionAttrs() {
  return {
    id: 'flow-empty',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': FLOW_EMPTY_REGION_LABEL,
  }
}

export function flowchartEmptyCopy(): { title: string; body: string } {
  return {
    title: '流程图为空',
    body: '还没有数据表。导入 CSV 或合并表后，侧栏与流程图会同步出现节点。',
  }
}

export function flowchartEmptyCtaAria(cmd: 'csv' | 'combine'): string {
  return cmd === 'csv' ? '从流程图空态导入 CSV' : '从流程图空态合并表'
}

/**
 * Focus restore target after CSV overlay closes from flowchart empty (Round 35).
 * Prefer the captured CTA; fall back to flowchart empty, then workspace empty
 * (Round 52 — workspace empty CTA × toast parity).
 */
export function flowchartEmptyCsvFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  return (
    (doc.querySelector(FLOW_EMPTY_CSV_CTA_SELECTOR) as HTMLElement | null) ||
    (doc.getElementById('flow-empty') as HTMLElement | null) ||
    workspaceEmptyCtaFocusFallback('csv', doc)
  )
}

/**
 * Focus restore target after Combine overlay closes from flowchart empty (Round 36).
 * Round 52: also fall through to workspace empty Combine CTA.
 */
export function flowchartEmptyCombineFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  return (
    (doc.querySelector(FLOW_EMPTY_COMBINE_CTA_SELECTOR) as HTMLElement | null) ||
    (doc.getElementById('flow-empty') as HTMLElement | null) ||
    workspaceEmptyCtaFocusFallback('combine', doc)
  )
}
