import { describe, expect, it } from 'vitest'
import { PROJECTS_CHUNK_SPLIT_DEFERRED, projectsChunkStrategy } from '@/shared/mock/projectsChunk'

describe('projectsChunk', () => {
  it('keeps Dexie/store/feedback co-located; mock projects stay sync', () => {
    expect(PROJECTS_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(projectsChunkStrategy()).toEqual({
      mockProjects: 'sync',
      dexieStore: 'shared-entry',
      feedback: 'css-decoupled-js-shared',
      splitDeferred: true,
      round35Feedback: 'keep-shared',
      round38Reeval: 'keep-shared',
    })
  })
})
