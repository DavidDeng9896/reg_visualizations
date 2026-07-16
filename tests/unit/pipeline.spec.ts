import { describe, expect, it } from 'vitest'
import { applyTransforms, runPipeline } from '@/modules/transform/pipeline'
import type { TableColumn } from '@/shared/types/analysis'

const columns: TableColumn[] = [
  { field: 'a', title: 'a', dataType: 'number' },
  { field: 'b', title: 'b', dataType: 'number' },
  { field: 'name', title: 'name', dataType: 'string' },
]

describe('pipeline', () => {
  it('filters and derives', () => {
    const out = runPipeline({
      columns,
      rows: [
        { a: 1, b: 2, name: 'x', __rowId: '1' },
        { a: 5, b: 1, name: 'y', __rowId: '2' },
      ],
      tableFilters: [],
      viewFilters: [{ id: 'f1', field: 'a', op: 'gt', value: 2 }],
      transforms: [{ id: 't1', kind: 'derived', config: { field: 'sum', expr: 'a + b' } }],
    })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].sum).toBe(6)
  })

  it('dedupes by fields', () => {
    const out = applyTransforms(columns, [
      { a: 1, b: 1, name: 'x' },
      { a: 1, b: 2, name: 'x' },
    ], [{ id: 'd', kind: 'dedupe', config: { fields: ['name'] } }])
    expect(out.rows).toHaveLength(1)
  })
})
