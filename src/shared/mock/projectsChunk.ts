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
  }
}
