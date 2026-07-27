import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { InsightStore } from './store.ts'

describe('InsightStore', () => {
  it('persists analysis data content into table_snapshots (no raw files)', () => {
    const dbPath = path.join(os.tmpdir(), `insight-test-${Date.now()}.sqlite`)
    const store = new InsightStore(dbPath)
    try {
      const saved = store.putAnalysis({
        id: 'a1',
        name: 'Test',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        revision: 1,
        tables: [
          {
            id: 't1',
            name: 'src',
            columns: [{ field: 'v', title: 'v', dataType: 'number' }],
            rows: [{ v: 1 }, { v: 2 }],
            stepId: 's1',
          },
        ],
        steps: [],
        files: [],
        flowchartLayout: {},
      })
      assert.equal(saved.revision, 1)
      const got = store.getAnalysis('a1')
      assert.ok(got)
      assert.equal(got!.tables[0].rows.length, 2)

      const snap = store.getLatestSnapshot('a1', 't1')
      assert.ok(snap)
      assert.equal(snap!.dataVersion, 'r1')
      assert.equal(snap!.rowCount, 2)
      assert.equal((snap!.rows as unknown[]).length, 2)
    } finally {
      store.db.close()
      fs.unlinkSync(dbPath)
    }
  })
})
