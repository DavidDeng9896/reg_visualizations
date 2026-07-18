/**
 * Analysis list page chunk strategy (Round 39–43 eval).
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
  }
}

/** Create warm should finish sooner than default workspace idle warm when racing. */
export function createWarmBeatsWorkspacePrefetchTimeout(
  createTimeoutMs: number,
  workspaceTimeoutMs: number,
): boolean {
  return createTimeoutMs < workspaceTimeoutMs
}
