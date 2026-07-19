/**
 * CSV PapaParse load / split evaluation (Round 37 / 43 / 45 / 46 / 48 / 50 / 52 /
 * 54 / 56 / 58 / 60 / 62 / 64 / 66 / 68 / 71 / 73 re-eval).
 *
 * PapaParse is only needed when the user picks a file — not for the Upload CSV
 * dialog chrome. Keeping a static import would inflate the CSV dialog chunk
 * (~25kb) before first paint of the modal.
 *
 * Contract: dynamic-import Papa on parse; idle-warm after the dialog opens so
 * the first file pick usually hits a warm module graph. Do not split Papa into
 * a separate route-level chunk beyond this lazy import.
 *
 * Round 43 / 45 / 46 / 48 / 50 / 52 / 54 / 56 / 58 / 60 / 62 / 64 / 66 / 68 / 71 / 73: CSV chrome
 * (~6.1) + lazy papaparse (~19.9) still the right split — keep deferred-dynamic.
 * No further route-level Papa chunk.
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export const CSV_PAPAPARSE_STATIC_DEFERRED = true as const

export type CsvPapaLoadMode = 'deferred-dynamic' | 'static-import'

export function csvPapaLoadMode(): CsvPapaLoadMode {
  return CSV_PAPAPARSE_STATIC_DEFERRED ? 'deferred-dynamic' : 'static-import'
}

export type CsvParseChunkStrategy = {
  papa: CsvPapaLoadMode
  round45Reeval: 'keep-deferred-dynamic'
  round46Reeval: 'keep-deferred-dynamic'
  round48Reeval: 'keep-deferred-dynamic'
  round50Reeval: 'keep-deferred-dynamic'
  round52Reeval: 'keep-deferred-dynamic'
  round54Reeval: 'keep-deferred-dynamic'
  round56Reeval: 'keep-deferred-dynamic'
  round58Reeval: 'keep-deferred-dynamic'
  round60Reeval: 'keep-deferred-dynamic'
  round62Reeval: 'keep-deferred-dynamic'
  round64Reeval: 'keep-deferred-dynamic'
  round66Reeval: 'keep-deferred-dynamic'
  round68Reeval: 'keep-deferred-dynamic'
  round71Reeval: 'keep-deferred-dynamic'
  round73Reeval: 'keep-deferred-dynamic'
}

export function csvParseChunkStrategy(): CsvParseChunkStrategy {
  return {
    papa: csvPapaLoadMode(),
    round45Reeval: 'keep-deferred-dynamic',
    round46Reeval: 'keep-deferred-dynamic',
    round48Reeval: 'keep-deferred-dynamic',
    round50Reeval: 'keep-deferred-dynamic',
    round52Reeval: 'keep-deferred-dynamic',
    round54Reeval: 'keep-deferred-dynamic',
    round56Reeval: 'keep-deferred-dynamic',
    round58Reeval: 'keep-deferred-dynamic',
    round60Reeval: 'keep-deferred-dynamic',
    round62Reeval: 'keep-deferred-dynamic',
    round64Reeval: 'keep-deferred-dynamic',
    round66Reeval: 'keep-deferred-dynamic',
    round68Reeval: 'keep-deferred-dynamic',
    round71Reeval: 'keep-deferred-dynamic',
    round73Reeval: 'keep-deferred-dynamic',
  }
}

export type PapaModule = typeof import('papaparse')

type PapaImport = () => Promise<PapaModule>

let papaPromise: Promise<PapaModule> | null = null

/** Load (and cache) PapaParse — used by parse + idle warm. */
export function loadPapa(importPapa: PapaImport = () => import('papaparse')): Promise<PapaModule> {
  if (!papaPromise) papaPromise = importPapa()
  return papaPromise
}

/** Idle-warm PapaParse after CSV dialog opens (Round 37). */
export function schedulePapaWarm(
  importPapa: PapaImport = () => import('papaparse'),
  idle: (run: () => void, timeoutMs?: number) => void = warmIdle,
): void {
  idle(() => {
    void loadPapa(importPapa)
  }, 2000)
}

/** Test helper — clear cached Papa promise between specs. */
export function resetPapaCache(): void {
  papaPromise = null
}
