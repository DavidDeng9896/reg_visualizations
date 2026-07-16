import Dexie, { type Table } from 'dexie'
import type { Analysis } from '@/shared/types/analysis'

export class InsightDB extends Dexie {
  analyses!: Table<Analysis, string>

  constructor() {
    super('insight-analysis')
    this.version(1).stores({
      analyses: 'id, projectId, updatedAt, name',
    })
  }
}

export const db = new InsightDB()
