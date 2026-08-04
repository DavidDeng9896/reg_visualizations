import { describe, expect, it } from 'vitest'
import { resolveTableCollapsedOnEnter } from '../../../src/modules/table/tableSourceVisibility'

describe('resolveTableCollapsedOnEnter', () => {
  it('首次进入默认显示数据源，并标记已访问', () => {
    expect(resolveTableCollapsedOnEnter(false)).toEqual({ collapsed: false, markVisited: true })
  })

  it('再次进入默认隐藏数据源', () => {
    expect(resolveTableCollapsedOnEnter(true)).toEqual({ collapsed: true, markVisited: false })
  })
})
