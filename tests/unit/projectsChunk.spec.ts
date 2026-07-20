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
      round39Reeval: 'keep-shared',
      round41Reeval: 'keep-shared',
      round42Reeval: 'keep-shared',
      round44Reeval: 'keep-shared',
      round45Reeval: 'keep-shared',
      round46Reeval: 'keep-shared',
      round48Reeval: 'keep-shared',
      round51Reeval: 'keep-shared',
      round54Reeval: 'keep-shared',
      round60Reeval: 'keep-shared',
      round63Reeval: 'keep-shared',
      round69Reeval: 'keep-shared',
      round78Reeval: 'keep-shared',
      round81Reeval: 'keep-shared',
    })
  })
})
