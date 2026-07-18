/**
 * FlowchartCanvas cold-path chunk strategy (Round 47 eval).
 *
 * FlowchartCanvas is already `defineAsyncComponent` on the workspace shell
 * with a short loading delay (avoid skeleton flash when warm). After the
 * workspace mounts and Vxe is ready, an idle import warms the flowchart
 * chunk so the first Flowchart click is not cold.
 *
 * Further splitting Flowchart internals would add waterfalls for a thin
 * canvas whose heavy cost is @vue-flow. Keep async-idle-warm.
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
}

export function flowchartChunkStrategy(): FlowchartChunkStrategy {
  return {
    loadMode: flowchartLoadMode(),
    warmAfterWorkspaceMount: true,
    splitDeferred: true,
    round47Reeval: 'keep-async-idle-warm',
  }
}
