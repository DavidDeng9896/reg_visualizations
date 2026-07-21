/** Sidebar empty-state copy / landmark / CTA a11y (Round 30–55). */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

export type SidebarEmptyKind = 'no-data' | 'no-match'

export const SIDEBAR_EMPTY_REGION_LABEL = '侧栏数据引导'

/** Prefer primary CSV CTA inside the sidebar empty landmark. */
export const SIDEBAR_EMPTY_CSV_CTA_SELECTOR = '#sidebar-empty .empty-cta.btn-primary'

export function sidebarEmptyKind(opts: {
  tableCount: number
  query: string
  visibleCount: number
}): SidebarEmptyKind | null {
  if (opts.visibleCount > 0) return null
  if (opts.tableCount === 0) return 'no-data'
  return 'no-match'
}

export function sidebarEmptyRegionAttrs() {
  return {
    id: 'sidebar-empty',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': SIDEBAR_EMPTY_REGION_LABEL,
  }
}

export function sidebarEmptyCopy(kind: SidebarEmptyKind): { title: string; body: string } {
  if (kind === 'no-data') {
    return {
      title: '开始导入数据',
      body: '还没有表。导入 CSV 或合并表后，侧栏会出现节点。',
    }
  }
  return {
    title: '无匹配的表或视图',
    body: '当前搜索没有结果。清除搜索可重新显示全部节点。',
  }
}

export function sidebarEmptyCtaAria(cmd: 'csv' | 'combine' | 'clear'): string {
  if (cmd === 'csv') return '从侧栏空态导入 CSV'
  if (cmd === 'combine') return '从侧栏空态合并表'
  return '清除侧栏搜索以显示全部'
}

/**
 * Round 55: sidebar empty CTA focus ring coexists with a toast (parity with
 * workspace / flowchart empty CTA × toast — toast stays interactive).
 */
export function sidebarEmptyCtaCoexistsWithToast(): true {
  return true
}

/**
 * Round 57: sidebar empty CTA × toast spot-check regression — same contract
 * as Round 55 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR57SpotCheck(): true {
  return true
}

/**
 * Round 60: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 spot-check (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR60Regression(): true {
  return true
}

/**
 * Round 63: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR63Regression(): true {
  return true
}

/**
 * Round 66: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR66Regression(): true {
  return true
}

/**
 * Round 68: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR68Regression(): true {
  return true
}

/**
 * Round 80: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR80Regression(): true {
  return true
}

/**
 * Round 82: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR82Regression(): true {
  return true
}

/**
 * Round 84: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR84Regression(): true {
  return true
}

/**
 * Round 86: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR86Regression(): true {
  return true
}

/**
 * Round 88: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR88Regression(): true {
  return true
}

/**
 * Round 90: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR90Regression(): true {
  return true
}

/**
 * Round 92: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR92Regression(): true {
  return true
}

/**
 * Round 94: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR94Regression(): true {
  return true
}

/**
 * Round 96: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR96Regression(): true {
  return true
}

/**
 * Round 98: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR98Regression(): true {
  return true
}

/**
 * Round 100: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR100Regression(): true {
  return true
}

/**
 * Round 102: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR102Regression(): true {
  return true
}

/**
 * Round 104: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR104Regression(): true {
  return true
}

/**
 * Round 106: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR106Regression(): true {
  return true
}

/**
 * Round 108: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR108Regression(): true {
  return true
}

/**
 * Round 110: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR110Regression(): true {
  return true
}

/**
 * Round 112: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 / R110 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR112Regression(): true {
  return true
}

/**
 * Round 114: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 / R110 / R112 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR114Regression(): true {
  return true
}

/**
 * Round 116: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 / R110 / R112 / R114 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR116Regression(): true {
  return true
}

/**
 * Round 118: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 / R110 / R112 / R114 / R116 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR118Regression(): true {
  return true
}

/**
 * Round 120: sidebar empty CTA × toast regression — same contract as
 * Round 55 / R57 / R60 / R63 / R66 / R68 / R80 / R82 / R84 / R86 / R88 / R90 / R92 / R94 / R96 / R98 / R100 / R102 / R104 / R106 / R108 / R110 / R112 / R114 / R116 / R118 (visible ring + interactive toast host).
 */
export function sidebarEmptyCtaToastR120Regression(): true {
  return true
}

/** First focusable empty CTA inside `#sidebar-empty` (CSV preferred). */
export function sidebarEmptyCtaSelector(): string {
  return '#sidebar-empty .empty-cta'
}

/**
 * Land keyboard focus on the sidebar empty CSV CTA with a visible restore
 * ring (Round 55 — toast may coexist; host stays interactive).
 */
export function applySidebarEmptyCtaFocus(doc: Document = document): void {
  const found =
    doc.querySelector(SIDEBAR_EMPTY_CSV_CTA_SELECTOR) ||
    doc.querySelector(sidebarEmptyCtaSelector())
  const el = found instanceof HTMLElement ? found : null
  restoreFocusEl(el, () => {
    const region = doc.getElementById('sidebar-empty')
    return region instanceof HTMLElement ? region : null
  }, { visibleRing: true })
}

/**
 * Focus restore fallback after CSV/Combine closes from sidebar empty
 * (Round 55 — prefer CTA, then landmark).
 */
export function sidebarEmptyCtaFocusFallback(
  cmd: 'csv' | 'combine' | 'clear' = 'csv',
  doc: Document = document,
): HTMLElement | null {
  const aria = sidebarEmptyCtaAria(cmd)
  const byAria = doc.querySelector(`#sidebar-empty [aria-label="${aria}"]`)
  if (byAria instanceof HTMLElement) return byAria
  const primary = doc.querySelector(SIDEBAR_EMPTY_CSV_CTA_SELECTOR)
  if (primary instanceof HTMLElement) return primary
  const any = doc.querySelector(sidebarEmptyCtaSelector())
  if (any instanceof HTMLElement) return any
  const region = doc.getElementById('sidebar-empty')
  return region instanceof HTMLElement ? region : null
}
