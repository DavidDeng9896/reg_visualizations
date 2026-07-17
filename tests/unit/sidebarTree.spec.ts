import { describe, expect, it } from 'vitest'
import {
  filterSidebarTree,
  flattenSidebarTree,
  type SidebarTreeNode,
} from '@/modules/sidebar/sidebarTree'

const sample: SidebarTreeNode[] = [
  {
    id: 't1',
    label: 'Dose Table',
    kind: 'table',
    tableId: 't1',
    children: [
      {
        id: 'v1',
        label: 'Scatter Dose-Response (scatter)',
        kind: 'view',
        tableId: 't1',
        children: [
          {
            id: 'v2',
            label: 'Bar of Scatter (bar)',
            kind: 'view',
            tableId: 't1',
          },
        ],
      },
    ],
  },
  {
    id: 't2',
    label: 'Other',
    kind: 'table',
    tableId: 't2',
    children: [],
  },
]

describe('sidebarTree', () => {
  it('flattens with depth for default-expand-all rendering', () => {
    const flat = flattenSidebarTree(sample)
    expect(flat.map((n) => [n.id, n.depth])).toEqual([
      ['t1', 0],
      ['v1', 1],
      ['v2', 2],
      ['t2', 0],
    ])
  })

  it('filters by label and keeps ancestors of matches', () => {
    const filtered = filterSidebarTree(sample, 'bar')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('t1')
    expect(filtered[0].children?.[0]?.id).toBe('v1')
    expect(filtered[0].children?.[0]?.children?.[0]?.id).toBe('v2')
  })

  it('returns a clone of the full tree when query is empty', () => {
    const filtered = filterSidebarTree(sample, '  ')
    expect(filtered).toHaveLength(2)
    expect(filtered[0].children?.[0]?.label).toContain('Scatter')
    expect(filtered).not.toBe(sample)
  })

  it('drops non-matching branches', () => {
    const filtered = filterSidebarTree(sample, 'other')
    expect(filtered.map((n) => n.id)).toEqual(['t2'])
  })
})
