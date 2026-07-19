/**
 * Analysis list page chunk strategy (Round 39–48 eval).
 *
 * AnalysisListView is already a route-lazy component. Further splitting the
 * list chrome (header / empty CTA / table) would add waterfalls for a thin
 * page whose heavy cost is Dexie (`projects` shared entry) + optional Create
 * dialog. Create stays `defineAsyncComponent` + idle-warm on Create interaction.
 *
 * Create warm (1.5s idle) vs workspace prefetch (after listReady, 4s idle):
 * both may overlap if the user focuses Create immediately; Create is ~3–4KB
 * gzip so contention is acceptable — prefer shorter Create timeout over
 * cancelling workspace warm (Demo / row open still need workspace).
 *
 * Round 40: re-checked CSS/JS boundary — still defer chrome split; vxe/echarts
 * remain workspace/chart-only (see `listHeavyDeps`).
 *
 * Round 41: list delete toast/focus + row roving add little gzip; still
 * keep-route-lazy (no chrome split).
 *
 * Round 42: Delete-key + Demo-fail Create ring + listFocusOrder markers are
 * tiny; chrome split still not worth the waterfall. Keep route-lazy.
 *
 * Round 43: filter aria-controls + clamp/refocus helpers are tiny; List gzip
 * boundary (~10.0) still acceptable — keep-route-lazy. Create/CSV cold paths
 * re-checked separately (still async-idle-warm / deferred-dynamic).
 *
 * Round 44: filter empty↔rows aria-controls + Delete Cancel ring + Demo-fail
 * Create inert helpers remain tiny; List gzip (~10.3) still keep-route-lazy.
 * Workspace toolbar / projects re-checked separately (still keep-sync-shell /
 * keep-shared).
 *
 * Round 45: skip↔aria-controls align + Delete Cancel opener ring + Create
 * Cancel×Demo toast + danger×toast inert helpers remain tiny; List gzip
 * boundary still keep-route-lazy. Create/CSV/projects re-checked below.
 *
 * Round 46: skip focus landing + list-main routeFocus protect + Delete/Create
 * Esc Cancel×toast helpers remain tiny; List gzip still keep-route-lazy.
 *
 * Round 47: landmark migrate + skip→Tab roving helpers remain tiny; List gzip
 * boundary still keep-route-lazy. Flowchart / Transform cold paths re-checked
 * separately (still async-idle-warm / deferred-sync).
 *
 * Round 48: landmark×filter no-steal + skip→Tab×filter coexistence + Delete
 * Esc×Demo toast helpers remain tiny; List gzip still keep-route-lazy.
 * Create/CSV/projects re-checked below.
 *
 * Round 49: delete roving clamp×toast + filter/skip Tab coexistence + Create
 * skip hide regression remain tiny; List gzip still keep-route-lazy.
 * Flowchart / Transform cold paths re-checked separately (still
 * async-idle-warm / deferred-sync).
 *
 * Round 50: empty CTA×toast + Create-close skip restore + Delete Cancel×Demo
 * + filter-focus preserve helpers remain tiny; List gzip still keep-route-lazy.
 * Create/CSV cold paths re-checked below.
 *
 * Round 51: empty Demo CTA×toast + Create Cancel skip→Tab + empty CTA
 * aria-controls preserve + Delete Esc×Demo regression remain tiny; List gzip
 * still keep-route-lazy. projects / workspace re-checked separately.
 *
 * Round 52: workspace empty CTA×toast + Demo success focus + skip→empty Tab
 * + Create Esc×Demo regression remain tiny; List gzip still keep-route-lazy.
 * Create / CSV cold paths re-checked below.
 *
 * Round 53: workspace skip→empty Tab + flowchart empty CTA×toast + Combine
 * Cancel×toast + filter Tab×empty CTA helpers remain tiny; List gzip still
 * keep-route-lazy. Flowchart / Transform cold paths re-checked below.
 *
 * Round 54: flowchart skip→empty Tab + CSV/Transform Cancel×toast + workspace
 * skip×filter coexistence helpers remain tiny; List gzip still keep-route-lazy.
 * Create / CSV / projects re-checked below.
 *
 * Round 55: New view Cancel×toast + sidebar empty CTA×toast + ChartEdit
 * Cancel×toast + Combine Esc regression remain tiny; List gzip still
 * keep-route-lazy. Flowchart / ChartEdit cold paths re-checked below.
 *
 * Round 56: Create Cancel×toast spot-check + empty CTA×toast regression +
 * CSV/Transform Esc×toast remain tiny; List gzip still keep-route-lazy.
 * Create / CSV cold paths re-checked below.
 */

export const LIST_PAGE_CHUNK_SPLIT_DEFERRED = true as const

export type ListPageChunkStrategy = {
  routeLazy: true
  createDialog: 'async-idle-warm'
  workspacePrefetch: 'after-list-ready'
  createWarmTimeoutMs: 1500
  splitDeferred: true
  round39Reeval: 'keep-route-lazy'
  round40Reeval: 'keep-route-lazy'
  round41Reeval: 'keep-route-lazy'
  round42Reeval: 'keep-route-lazy'
  round43Reeval: 'keep-route-lazy'
  round44Reeval: 'keep-route-lazy'
  round45Reeval: 'keep-route-lazy'
  round46Reeval: 'keep-route-lazy'
  round47Reeval: 'keep-route-lazy'
  round48Reeval: 'keep-route-lazy'
  round49Reeval: 'keep-route-lazy'
  round50Reeval: 'keep-route-lazy'
  round51Reeval: 'keep-route-lazy'
  round52Reeval: 'keep-route-lazy'
  round53Reeval: 'keep-route-lazy'
  round54Reeval: 'keep-route-lazy'
  round55Reeval: 'keep-route-lazy'
  round56Reeval: 'keep-route-lazy'
}

export function listPageChunkStrategy(): ListPageChunkStrategy {
  return {
    routeLazy: true,
    createDialog: 'async-idle-warm',
    workspacePrefetch: 'after-list-ready',
    createWarmTimeoutMs: 1500,
    splitDeferred: true,
    round39Reeval: 'keep-route-lazy',
    round40Reeval: 'keep-route-lazy',
    round41Reeval: 'keep-route-lazy',
    round42Reeval: 'keep-route-lazy',
    round43Reeval: 'keep-route-lazy',
    round44Reeval: 'keep-route-lazy',
    round45Reeval: 'keep-route-lazy',
    round46Reeval: 'keep-route-lazy',
    round47Reeval: 'keep-route-lazy',
    round48Reeval: 'keep-route-lazy',
    round49Reeval: 'keep-route-lazy',
    round50Reeval: 'keep-route-lazy',
    round51Reeval: 'keep-route-lazy',
    round52Reeval: 'keep-route-lazy',
    round53Reeval: 'keep-route-lazy',
    round54Reeval: 'keep-route-lazy',
    round55Reeval: 'keep-route-lazy',
    round56Reeval: 'keep-route-lazy',
  }
}

/** Create warm should finish sooner than default workspace idle warm when racing. */
export function createWarmBeatsWorkspacePrefetchTimeout(
  createTimeoutMs: number,
  workspaceTimeoutMs: number,
): boolean {
  return createTimeoutMs < workspaceTimeoutMs
}
