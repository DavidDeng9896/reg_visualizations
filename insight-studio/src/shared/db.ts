import Dexie, { type Table as DexieTable } from 'dexie'
import type { Analysis, AnalysisFile } from './types'

export const DB_NAME = 'insight-studio'

/** Dexie / IndexedDB 主存储。Analysis 整体为一条记录。 */
export class InsightStudioDB extends Dexie {
  analyses!: DexieTable<Analysis, string>
  files!: DexieTable<AnalysisFile, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(2).stores({
      analyses: 'id, name, updatedAt',
      files: 'id, name',
    })
  }
}

export const db = new InsightStudioDB()
