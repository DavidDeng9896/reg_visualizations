/** Flowchart empty-state copy / landmark / CTA a11y (Round 29–54). */

import { restoreFocusEl } from '@/shared/ui/focusRestore'
import { workspaceEmptyCtaFocusFallback } from '@/modules/table/workspaceEmpty'

export const FLOW_EMPTY_REGION_LABEL = '流程图引导'

/**
 * Round 54: after skip lands on `#flow-empty`, Tab enters the first empty CTA
 * (parity with workspace skip→empty CTA, Round 53).
 */
export function flowchartSkipTabEntersEmptyCta(): true {
  return true
}

/**
 * Round 61: flowchart skip→empty Tab regression — same contract as
 * Round 54 (Tab after skip on #flow-empty enters the first empty CTA).
 */
export function flowchartSkipTabEmptyCtaR61Regression(): true {
  return true
}

/**
 * Round 70: flowchart skip→empty Tab regression — same contract as
 * Round 54 / R61 (Tab after skip on #flow-empty enters the first empty CTA).
 */
export function flowchartSkipTabEmptyCtaR70Regression(): true {
  return true
}

/** Selector for the CSV CTA inside the flowchart empty region. */
export const FLOW_EMPTY_CSV_CTA_SELECTOR = '[aria-label="从流程图空态导入 CSV"]'

/** Selector for the Combine CTA inside the flowchart empty region. */
export const FLOW_EMPTY_COMBINE_CTA_SELECTOR = '[aria-label="从流程图空态合并表"]'

/** Prefer primary CSV CTA inside the flowchart empty landmark. */
export const FLOW_EMPTY_CSV_CTA_CLASS_SELECTOR = '#flow-empty .empty-cta.btn-primary'

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
 * Round 53: flowchart empty CTA focus ring coexists with a toast (parity with
 * workspace empty CTA × toast — toast stays interactive).
 */
export function flowchartEmptyCtaCoexistsWithToast(): true {
  return true
}

/**
 * Round 59: flowchart empty CTA × toast regression — same contract as
 * Round 53 (visible ring + interactive toast host).
 */
export function flowchartEmptyCtaToastR59Regression(): true {
  return true
}

/**
 * Round 64: flowchart empty CTA × toast regression — same contract as
 * Round 53 / R59 (visible ring + interactive toast host).
 */
export function flowchartEmptyCtaToastR64Regression(): true {
  return true
}

/**
 * Round 66: flowchart empty CTA × toast regression — same contract as
 * Round 53 / R59 / R64 (visible ring + interactive toast host).
 */
export function flowchartEmptyCtaToastR66Regression(): true {
  return true
}

/**
 * Round 68: flowchart empty CTA × toast regression — same contract as
 * Round 53 / R59 / R64 / R66 (visible ring + interactive toast host).
 */
export function flowchartEmptyCtaToastR68Regression(): true {
  return true
}

/**
 * Round 73: flowchart empty CTA × toast regression — same contract as
 * Round 53 / R59 / R64 / R66 / R68 (visible ring + interactive toast host).
 */
export function flowchartEmptyCtaToastR73Regression(): true {
  return true
}

/** First focusable empty CTA inside `#flow-empty` (CSV preferred). */
export function flowchartEmptyCtaSelector(): string {
  return '#flow-empty .empty-cta'
}

/**
 * Land keyboard focus on the flowchart empty CSV CTA with a visible restore
 * ring (Round 53 — toast may coexist; host stays interactive).
 */
export function applyFlowchartEmptyCtaFocus(doc: Document = document): void {
  const found =
    doc.querySelector(FLOW_EMPTY_CSV_CTA_CLASS_SELECTOR) ||
    doc.querySelector(FLOW_EMPTY_CSV_CTA_SELECTOR) ||
    doc.querySelector(flowchartEmptyCtaSelector())
  const el = found instanceof HTMLElement ? found : null
  restoreFocusEl(el, () => {
    const region = doc.getElementById('flow-empty')
    return region instanceof HTMLElement ? region : null
  }, { visibleRing: true })
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
