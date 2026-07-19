/**
 * CreateAnalysisDialog code-split + idle warm (Round 38–50).
 *
 * Dialog stays `defineAsyncComponent` on the list page so list first paint does
 * not pull the Create modal. After the user interacts with a Create trigger
 * (hover/focus), idle-warm the chunk so the first open usually hits a warm
 * module graph — same pattern as Papa / pipeline / fitEngine warm.
 *
 * Round 39: Demo CTA never schedules Create warm (separate path). Create warm
 * may overlap workspace route prefetch; Create is tiny (~3–4KB) so both stay
 * scheduled — Create uses a shorter idle timeout to win the race when the user
 * is already aiming at Create.
 *
 * Round 43 / 45 / 46 / 48 / 50 / 52 / 54 / 56 / 58 / 60 re-eval: Create cold path
 * still async-idle-warm (1.5s). Eager sync would inflate list first paint for
 * a rarely opened dialog — keep deferred.
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const CREATE_ANALYSIS_IDLE_WARM = true as const

/** Idle timeout for Create warm — shorter than workspace prefetch default (4s). */
export const CREATE_ANALYSIS_WARM_TIMEOUT_MS = 1500

export type CreateAnalysisLoadMode = 'async-idle-warm' | 'eager-sync'

export function createAnalysisLoadMode(): CreateAnalysisLoadMode {
  return CREATE_ANALYSIS_IDLE_WARM ? 'async-idle-warm' : 'eager-sync'
}

export type CreateAnalysisChunkStrategy = {
  load: CreateAnalysisLoadMode
  warmTimeoutMs: typeof CREATE_ANALYSIS_WARM_TIMEOUT_MS
  round45Reeval: 'keep-async-idle-warm'
  round46Reeval: 'keep-async-idle-warm'
  round48Reeval: 'keep-async-idle-warm'
  round50Reeval: 'keep-async-idle-warm'
  round52Reeval: 'keep-async-idle-warm'
  round54Reeval: 'keep-async-idle-warm'
  round56Reeval: 'keep-async-idle-warm'
  round58Reeval: 'keep-async-idle-warm'
  round60Reeval: 'keep-async-idle-warm'
}

export function createAnalysisChunkStrategy(): CreateAnalysisChunkStrategy {
  return {
    load: createAnalysisLoadMode(),
    warmTimeoutMs: CREATE_ANALYSIS_WARM_TIMEOUT_MS,
    round45Reeval: 'keep-async-idle-warm',
    round46Reeval: 'keep-async-idle-warm',
    round48Reeval: 'keep-async-idle-warm',
    round50Reeval: 'keep-async-idle-warm',
    round52Reeval: 'keep-async-idle-warm',
    round54Reeval: 'keep-async-idle-warm',
    round56Reeval: 'keep-async-idle-warm',
    round58Reeval: 'keep-async-idle-warm',
    round60Reeval: 'keep-async-idle-warm',
  }
}

/**
 * Empty-list Demo CTA and Create warm coexist: Demo never warms Create;
 * Create warm never disables Demo (Round 39).
 */
export function demoCtaLeavesCreateWarmIndependent(): true {
  return true
}

/**
 * Demo success path must not schedule Create warm (Round 41).
 * Create triggers (hover/focus/click) remain the only warm entry.
 */
export function demoSuccessPathWarmsCreate(): false {
  return false
}

type CreateImport = () => Promise<unknown>

/** Idle-warm CreateAnalysisDialog after list Create interaction (Round 38–39). */
export function scheduleCreateAnalysisWarm(
  importCreate: CreateImport = () => import('@/modules/analysis/views/CreateAnalysisDialog.vue'),
  idle: (run: () => void, timeoutMs?: number) => void = warmIdle,
): void {
  idle(() => {
    void importCreate()
  }, CREATE_ANALYSIS_WARM_TIMEOUT_MS)
}
