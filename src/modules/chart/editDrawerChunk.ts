/**
 * ChartEditDrawer code-split + warm-up evaluation (Round 34–55).
 *
 * Candidates considered:
 * - `fitEngine`: already consumed by chart runtime / ChartPanel path, not by
 *   ChartEditDrawer. Drawer only exposes fit model + constraint fields; no
 *   further EditDrawer→fitEngine edge to split.
 * - Series color palette (`paletteColors` in seriesStyle): tiny sync helpers
 *   shared with runtime color resolution. Async-chunking would add a boundary
 *   for ~a few dozen bytes of constants — not worth a separate network hop.
 *
 * Round 35: keep fitEngine co-located with runtime (still deferred split), but
 * when the Edit drawer opens, idle-warm `fitEngine` so MODEL / fit interactions
 * after configure hit a warm module graph without paying on first paint.
 *
 * ChartEditDrawer remains a single async SFC at the workspace boundary
 * (`defineAsyncComponent` in TableChartWorkspace). STYLE stays sync-vif
 * (see stylePanelChunk). Keep this deferral until a draft-binding or
 * palette/runtime split is designed.
 *
 * Round 55: Cancel×toast restore helpers are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 57: Esc×toast regression markers are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 61: CSV/Combine Cancel×toast + empty CTA / skip→Tab regressions are
 * tiny; fitEngine/palette still deferred-sync (no cleaner split).
 *
 * Round 63: CSV Esc×toast + workspace skip→empty Tab + Combine Esc×toast +
 * sidebar empty CTA×toast are tiny; fitEngine/palette still deferred-sync
 * (no cleaner split).
 *
 * Round 65: Create Esc×toast + workspace empty CTA×toast + CSV Cancel×toast +
 * list empty CTA×toast are tiny; fitEngine/palette still deferred-sync
 * (no cleaner split).
 *
 * Round 67: Transform Esc×toast + workspace empty CTA×toast + CSV Esc×toast +
 * New view Cancel×toast are tiny; fitEngine/palette still deferred-sync
 * (no cleaner split).
 *
 * Round 78: CSV Esc×toast + workspace skip→empty Tab + Combine Esc×toast +
 * list empty CTA×toast are tiny; fitEngine/palette still deferred-sync
 * (no cleaner split).
 *
 * Round 79: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 81: Transform Esc×toast + flowchart empty CTA×toast + ChartEdit
 * Cancel×toast + list empty CTA×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 83: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 85: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 87: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 89: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 91: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 93: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 95: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 97: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 99: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 101: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 103: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 *
 * Round 105: Transform Cancel×toast + flowchart empty CTA×toast + ChartEdit
 * Esc×toast + New view Cancel×toast are tiny; fitEngine/palette still
 * deferred-sync (no cleaner split).
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED = true as const
export const EDIT_DRAWER_PALETTE_SPLIT_DEFERRED = true as const

export type EditDrawerChunkDecision = 'deferred-sync' | 'async-chunk'

export function editDrawerFitEngineSplitMode(): EditDrawerChunkDecision {
  return EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}

export function editDrawerPaletteSplitMode(): EditDrawerChunkDecision {
  return EDIT_DRAWER_PALETTE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}

export type EditDrawerChunkStrategy = {
  fitEngine: EditDrawerChunkDecision
  palette: EditDrawerChunkDecision
  warmOnOpen: true
  round35Reeval: 'keep-deferred-sync'
  round55Reeval: 'keep-deferred-sync'
  round57Reeval: 'keep-deferred-sync'
  round61Reeval: 'keep-deferred-sync'
  round63Reeval: 'keep-deferred-sync'
  round65Reeval: 'keep-deferred-sync'
  round67Reeval: 'keep-deferred-sync'
  round69Reeval: 'keep-deferred-sync'
  round78Reeval: 'keep-deferred-sync'
  round79Reeval: 'keep-deferred-sync'
  round81Reeval: 'keep-deferred-sync'
  round83Reeval: 'keep-deferred-sync'
  round85Reeval: 'keep-deferred-sync'
  round87Reeval: 'keep-deferred-sync'
  round89Reeval: 'keep-deferred-sync'
  round91Reeval: 'keep-deferred-sync'
  round93Reeval: 'keep-deferred-sync'
  round95Reeval: 'keep-deferred-sync'
  round97Reeval: 'keep-deferred-sync'
  round99Reeval: 'keep-deferred-sync'
  round101Reeval: 'keep-deferred-sync'
  round103Reeval: 'keep-deferred-sync'
  round105Reeval: 'keep-deferred-sync'
  round107Reeval: 'keep-deferred-sync'
}

export function editDrawerChunkStrategy(): EditDrawerChunkStrategy {
  return {
    fitEngine: editDrawerFitEngineSplitMode(),
    palette: editDrawerPaletteSplitMode(),
    warmOnOpen: true,
    round35Reeval: 'keep-deferred-sync',
    round55Reeval: 'keep-deferred-sync',
    round57Reeval: 'keep-deferred-sync',
    round61Reeval: 'keep-deferred-sync',
    round63Reeval: 'keep-deferred-sync',
    round65Reeval: 'keep-deferred-sync',
    round67Reeval: 'keep-deferred-sync',
    round69Reeval: 'keep-deferred-sync',
    round78Reeval: 'keep-deferred-sync',
    round79Reeval: 'keep-deferred-sync',
    round81Reeval: 'keep-deferred-sync',
    round83Reeval: 'keep-deferred-sync',
    round85Reeval: 'keep-deferred-sync',
    round87Reeval: 'keep-deferred-sync',
    round89Reeval: 'keep-deferred-sync',
    round91Reeval: 'keep-deferred-sync',
    round93Reeval: 'keep-deferred-sync',
    round95Reeval: 'keep-deferred-sync',
    round97Reeval: 'keep-deferred-sync',
    round99Reeval: 'keep-deferred-sync',
    round101Reeval: 'keep-deferred-sync',
    round103Reeval: 'keep-deferred-sync',
    round105Reeval: 'keep-deferred-sync',
    round107Reeval: 'keep-deferred-sync',
  }
}

type FitImport = () => Promise<unknown>

/** Idle-warm fitEngine after Edit drawer opens (Round 35). */
export function scheduleFitRuntimeWarm(
  importFit: FitImport = () => import('./fitEngine'),
  idle: (run: () => void, timeoutMs?: number) => void = warmIdle,
): void {
  idle(() => {
    void importFit()
  }, 2000)
}
