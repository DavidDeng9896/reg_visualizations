/**
 * FlowchartCanvas cold-path chunk strategy (Round 47–53 eval).
 *
 * FlowchartCanvas is already `defineAsyncComponent` on the workspace shell
 * with a short loading delay (avoid skeleton flash when warm). After the
 * workspace mounts and Vxe is ready, an idle import warms the flowchart
 * chunk so the first Flowchart click is not cold.
 *
 * Further splitting Flowchart internals would add waterfalls for a thin
 * canvas whose heavy cost is @vue-flow. Keep async-idle-warm.
 *
 * Round 49: re-checked after list delete-roving / filter-skip Tab helpers —
 * still no cleaner split; keep async-idle-warm.
 *
 * Round 53: re-checked after flowchart empty CTA×toast + workspace skip→Tab
 * helpers — still keep async-idle-warm.
 *
 * Round 55: re-checked after New view Cancel×toast + sidebar empty CTA +
 * ChartEdit Cancel×toast helpers — still keep async-idle-warm.
 */

export const FLOWCHART_COLD_WARM_DEFERRED = true as const

export type FlowchartLoadMode = 'async-idle-warm' | 'sync-eager'

export function flowchartLoadMode(): FlowchartLoadMode {
  return FLOWCHART_COLD_WARM_DEFERRED ? 'async-idle-warm' : 'sync-eager'
}

export type FlowchartChunkStrategy = {
  loadMode: FlowchartLoadMode
  warmAfterWorkspaceMount: true
  splitDeferred: true
  round47Reeval: 'keep-async-idle-warm'
  round49Reeval: 'keep-async-idle-warm'
  round53Reeval: 'keep-async-idle-warm'
  round55Reeval: 'keep-async-idle-warm'
}

export function flowchartChunkStrategy(): FlowchartChunkStrategy {
  return {
    loadMode: flowchartLoadMode(),
    warmAfterWorkspaceMount: true,
    splitDeferred: true,
    round47Reeval: 'keep-async-idle-warm',
    round49Reeval: 'keep-async-idle-warm',
    round53Reeval: 'keep-async-idle-warm',
    round55Reeval: 'keep-async-idle-warm',
  }
}
