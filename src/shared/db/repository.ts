import { db } from './dexie'
import type { Analysis } from '@/shared/types/analysis'

export interface AnalysisRepository {
  list(): Promise<Analysis[]>
  get(id: string): Promise<Analysis | undefined>
  save(analysis: Analysis): Promise<void>
  remove(id: string): Promise<void>
}

export const analysisRepository: AnalysisRepository = {
  async list() {
    return db.analyses.orderBy('updatedAt').reverse().toArray()
  },
  async get(id) {
    return db.analyses.get(id)
  },
  async save(analysis) {
    await db.analyses.put(analysis)
  },
  async remove(id) {
    await db.analyses.delete(id)
  },
}
