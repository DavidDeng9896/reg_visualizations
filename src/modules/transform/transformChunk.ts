/**
 * TransformDialog warm / split evaluation (Round 36).
 *
 * `pipeline` is already a sync import inside TransformDialog (needed for Save
 * validation). Splitting it into a separate async chunk would add a race on
 * first Save. Instead: when Transform opens, idle-warm the pipeline module so
 * repeat Save / preview paths hit a warm graph without paying on first paint
 * of the workspace shell.
 *
 * TransformDialog itself remains `defineAsyncComponent` at the table/chart
 * boundary (see TableChartWorkspace).
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const TRANSFORM_PIPELINE_SPLIT_DEFERRED = true as const

export type TransformPipelineSplitMode = 'deferred-sync' | 'async-chunk'

export function transformPipelineSplitMode(): TransformPipelineSplitMode {
  return TRANSFORM_PIPELINE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}

type PipelineImport = () => Promise<unknown>

/** Idle-warm transform pipeline after Transform dialog opens (Round 36). */
export function schedulePipelineWarm(
  importPipeline: PipelineImport = () => import('./pipeline'),
  idle: (run: () => void, timeoutMs?: number) => void = warmIdle,
): void {
  idle(() => {
    void importPipeline()
  }, 2000)
}
