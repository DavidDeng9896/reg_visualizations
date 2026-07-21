import Dexie, { type Table as DexieTable } from 'dexie'
import type { Analysis } from './types'

export const DB_NAME = 'insight-studio'

/** Dexie / IndexedDB 主存储。Analysis 整体为一条记录。 */
export class InsightStudioDB extends Dexie {
  analyses!: DexieTable<Analysis, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(1).stores({
      analyses: 'id, name, updatedAt',
    })
  }
}

export const db = new InsightStudioDB()
