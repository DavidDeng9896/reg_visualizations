/**
 * Entry-chunk strategy for mock projects vs Dexie/store/feedback (Round 30–39 eval).
 *
 * Build names the shared list/workspace graph after `projects.ts`, but most of
 * the ~100KB+ is Dexie + analysisStore + feedback JS. `MOCK_PROJECTS` itself is
 * tiny. Splitting Dexie into a separate async chunk would delay first open of
 * every Analysis and complicate the store bootstrap.
 *
 * Round 33–35 re-eval of the feedback boundary: feedback CSS stays decoupled via
 * `main.css` (R25). feedback JS remains on the shared entry because toast /
 * confirm are used from list + sidebar + workspace paths; extracting it to a
 * dedicated async chunk would add a race on first toast and does not shrink the
 * critical list→workspace path meaningfully.
 *
 * Round 35: revisited after Transform Teleport / EditDrawer fit warm — still no
 * clean async boundary that shrinks first meaningful paint without racing first
 * toast/confirm. Keep mock projects sync; leave Dexie/store/feedback JS co-located.
 *
 * Round 38: revisited after Create/New view Teleport + Create idle-warm — still
 * no clean async boundary for Dexie/store/feedback without racing first
 * toast/confirm on list delete / Demo create. Keep shared; warm Create instead.
 *
 * Round 39: list cold-start + Create warm timeout tweak does not unlock a Dexie
 * split; keep shared entry.
 *
 * Round 41: list row roving + delete toast/focus ring do not unlock a Dexie /
 * feedback split; keep shared entry.
 *
 * Round 42: Delete-key / Demo-fail Create ring / list focus-order markers do
 * not unlock a Dexie split; keep shared entry.
 *
 * Round 44: filter aria-controls / Delete Cancel ring / Demo-fail Create inert
 * do not unlock a Dexie split; keep shared entry. Workspace toolbar still
 * sync with table/chart (see workspaceViewChunk / tableChartWorkspaceChunk).
 *
 * Round 45: skip/aria-controls align + Cancel opener ring + Create Cancel×Demo
 * toast + danger×toast inert do not unlock a Dexie split; keep shared entry.
 */

export const PROJECTS_CHUNK_SPLIT_DEFERRED = true

export type ProjectsChunkStrategy = {
  mockProjects: 'sync'
  dexieStore: 'shared-entry'
  feedback: 'css-decoupled-js-shared'
  splitDeferred: true
  /** Round 35 re-eval outcome — still not worth an async feedback chunk. */
  round35Feedback: 'keep-shared'
  /** Round 38 re-eval — still keep Dexie/store/feedback on shared entry. */
  round38Reeval: 'keep-shared'
  /** Round 39 re-eval — still keep shared after Create warm / list chunk pass. */
  round39Reeval: 'keep-shared'
  /** Round 41 re-eval — still keep shared after list roving / delete toast. */
  round41Reeval: 'keep-shared'
  /** Round 42 re-eval — still keep shared after Delete-key / Demo-fail ring. */
  round42Reeval: 'keep-shared'
  /** Round 44 re-eval — still keep shared after filter/Delete/Create a11y pass. */
  round44Reeval: 'keep-shared'
  /** Round 45 re-eval — still keep shared after skip/Cancel/toast a11y pass. */
  round45Reeval: 'keep-shared'
}

export function projectsChunkStrategy(): ProjectsChunkStrategy {
  return {
    mockProjects: 'sync',
    dexieStore: 'shared-entry',
    feedback: 'css-decoupled-js-shared',
    splitDeferred: true,
    round35Feedback: 'keep-shared',
    round38Reeval: 'keep-shared',
    round39Reeval: 'keep-shared',
    round41Reeval: 'keep-shared',
    round42Reeval: 'keep-shared',
    round44Reeval: 'keep-shared',
    round45Reeval: 'keep-shared',
  }
}
