import { describe, expect, it } from 'vitest'
import { iconForMention, iconForViewType } from '../../../src/modules/ai/mentionIcons'

describe('mentionIcons', () => {
  it('maps analysis and table kinds', () => {
    expect(iconForMention({ kind: 'analysis' })).toBe('database')
    expect(iconForMention({ kind: 'table', tableId: 't1' })).toBe('table')
  })

  it('maps view by type with table fallback', () => {
    expect(iconForMention({ kind: 'view', tableId: 't1', viewId: 'v1' }, 'bar')).toBe('bar')
    expect(iconForMention({ kind: 'view', tableId: 't1', viewId: 'v1' }, 'heatmap')).toBe('heatmap')
    expect(iconForMention({ kind: 'view', tableId: 't1', viewId: 'v1' })).toBe('table')
    expect(iconForViewType('unknown')).toBe('table')
  })
})
