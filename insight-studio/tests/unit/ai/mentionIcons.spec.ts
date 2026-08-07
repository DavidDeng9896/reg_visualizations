import { describe, expect, it } from 'vitest'
import { mentionIcon } from '../../../src/modules/ai/mentionIcons'
import type { Analysis } from '../../../src/shared/types'

function analysis(partial: Partial<Analysis>): Analysis {
  return {
    id: 'a1',
    name: '测试分析',
    tables: [],
    steps: [],
    ...partial,
  } as Analysis
}

describe('mentionIcon', () => {
  it('分析用 database，表用 table，视图用类型图标', () => {
    const a = analysis({
      tables: [
        {
          id: 't1',
          name: '销售',
          source: { kind: 'inline' },
          columns: [],
          rows: [],
          filters: [],
          views: [
            { id: 'v1', name: '柱状', type: 'bar', children: [], chart: null },
            {
              id: 'v2',
              name: '嵌套折线',
              type: 'line',
              children: [],
              chart: null,
            },
          ],
        },
      ],
    })
    expect(mentionIcon({ kind: 'analysis' }, a)).toBe('database')
    expect(mentionIcon({ kind: 'table', tableId: 't1' }, a)).toBe('table')
    expect(mentionIcon({ kind: 'view', tableId: 't1', viewId: 'v1' }, a)).toBe('bar')
    expect(mentionIcon({ kind: 'view', tableId: 't1', viewId: 'v2' }, a)).toBe('line')
  })
})
