import Dexie, { type Table as DexieTable } from 'dexie'
import type { Analysis, AnalysisFile, Dashboard } from './types'

export const DB_NAME = 'insight-studio'

/** Dexie / IndexedDB 主存储。Analysis / Dashboard 整体为一条记录。 */
export class InsightStudioDB extends Dexie {
  analyses!: DexieTable<Analysis, string>
  files!: DexieTable<AnalysisFile, string>
  dashboards!: DexieTable<Dashboard, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(2).stores({
      analyses: 'id, name, updatedAt',
      files: 'id, name',
    })
    this.version(3).stores({
      analyses: 'id, name, updatedAt',
      files: 'id, name',
      dashboards: 'id, name, updatedAt',
    })
  }
}

export const db = new InsightStudioDB()
