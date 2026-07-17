/**
 * Entry-chunk strategy for mock projects vs Dexie/store/feedback (Round 30 eval).
 *
 * Build names the shared list/workspace graph after `projects.ts`, but most of
 * the ~100KB+ is Dexie + analysisStore + feedback JS. `MOCK_PROJECTS` itself is
 * tiny. Splitting Dexie into a separate async chunk would delay first open of
 * every Analysis and complicate the store bootstrap.
 *
 * Keep mock projects sync; leave Dexie/store on the shared entry; feedback CSS
 * already decoupled (Round 25). Revisit only if IndexedDB init becomes lazy.
 */

export const PROJECTS_CHUNK_SPLIT_DEFERRED = true

export type ProjectsChunkStrategy = {
  mockProjects: 'sync'
  dexieStore: 'shared-entry'
  feedback: 'css-decoupled'
  splitDeferred: true
}

export function projectsChunkStrategy(): ProjectsChunkStrategy {
  return {
    mockProjects: 'sync',
    dexieStore: 'shared-entry',
    feedback: 'css-decoupled',
    splitDeferred: true,
  }
}
