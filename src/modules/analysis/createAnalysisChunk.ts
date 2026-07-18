/**
 * CreateAnalysisDialog code-split + idle warm (Round 38).
 *
 * Dialog stays `defineAsyncComponent` on the list page so list first paint does
 * not pull the Create modal. After the user interacts with a Create trigger
 * (hover/focus), idle-warm the chunk so the first open usually hits a warm
 * module graph — same pattern as Papa / pipeline / fitEngine warm.
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const CREATE_ANALYSIS_IDLE_WARM = true as const

export type CreateAnalysisLoadMode = 'async-idle-warm' | 'eager-sync'

export function createAnalysisLoadMode(): CreateAnalysisLoadMode {
  return CREATE_ANALYSIS_IDLE_WARM ? 'async-idle-warm' : 'eager-sync'
}

type CreateImport = () => Promise<unknown>

/** Idle-warm CreateAnalysisDialog after list Create interaction (Round 38). */
export function scheduleCreateAnalysisWarm(
  importCreate: CreateImport = () => import('@/modules/analysis/views/CreateAnalysisDialog.vue'),
  idle: (run: () => void, timeoutMs?: number) => void = warmIdle,
): void {
  idle(() => {
    void importCreate()
  }, 2000)
}
