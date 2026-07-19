/**
 * TransformDialog warm / split evaluation (Round 36 + Round 47–53 re-eval).
 *
 * `pipeline` is already a sync import inside TransformDialog (needed for Save
 * validation). Splitting it into a separate async chunk would add a race on
 * first Save. Instead: when Transform opens, idle-warm the pipeline module so
 * repeat Save / preview paths hit a warm graph without paying on first paint
 * of the workspace shell.
 *
 * TransformDialog itself remains `defineAsyncComponent` at the table/chart
 * boundary (see TableChartWorkspace).
 *
 * Round 47: cold-path spot-check — still deferred-sync + idle-warm on open;
 * no cleaner async split without racing first Save validation.
 *
 * Round 49: re-checked with List gzip / filter-skip Tab helpers — still
 * deferred-sync + idle-warm on open.
 *
 * Round 53: re-checked with flowchart empty CTA×toast / Combine Cancel×toast
 * helpers — still deferred-sync + idle-warm on open.
 *
 * Round 59: re-checked with Combine Esc×toast / flowchart empty CTA×toast /
 * CSV Esc×toast / New view Cancel×toast helpers — still deferred-sync +
 * idle-warm on open.
 *
 * Round 62: re-checked with Create Cancel×toast / empty CTA×toast / Transform
 * Esc×toast / New view Cancel×toast helpers — still deferred-sync +
 * idle-warm on open.
 *
 * Round 64: re-checked with Transform Cancel×toast / flowchart empty CTA×toast
 * / ChartEdit Esc×toast / New view Cancel×toast helpers — still deferred-sync +
 * idle-warm on open.
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const TRANSFORM_PIPELINE_SPLIT_DEFERRED = true as const

export type TransformPipelineSplitMode = 'deferred-sync' | 'async-chunk'

export function transformPipelineSplitMode(): TransformPipelineSplitMode {
  return TRANSFORM_PIPELINE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}

export type TransformChunkStrategy = {
  pipelineSplit: TransformPipelineSplitMode
  idleWarmOnOpen: true
  round47Reeval: 'keep-deferred-sync'
  round49Reeval: 'keep-deferred-sync'
  round53Reeval: 'keep-deferred-sync'
  round59Reeval: 'keep-deferred-sync'
  round62Reeval: 'keep-deferred-sync'
  round64Reeval: 'keep-deferred-sync'
}

export function transformChunkStrategy(): TransformChunkStrategy {
  return {
    pipelineSplit: transformPipelineSplitMode(),
    idleWarmOnOpen: true,
    round47Reeval: 'keep-deferred-sync',
    round49Reeval: 'keep-deferred-sync',
    round53Reeval: 'keep-deferred-sync',
    round59Reeval: 'keep-deferred-sync',
    round62Reeval: 'keep-deferred-sync',
    round64Reeval: 'keep-deferred-sync',
  }
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
