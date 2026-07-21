import { describe, expect, it, vi } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import {
  cancelDraft,
  cloneConfig,
  commitDraft,
  configsEqual,
  createDraft,
  debounce,
  isDirty,
  updateDraft,
} from '../../../src/modules/charts/draft'

describe('draft 模型', () => {
  it('createDraft 深拷贝：草稿与 saved 互不影响', () => {
    const saved = createChartConfig('bar')
    saved.configure.x = { field: 'cat' }
    const d = createDraft(saved)
    d.draft.configure.x!.field = 'other'
    expect(d.saved.configure.x?.field).toBe('cat')
    expect(saved.configure.x?.field).toBe('cat')
  })

  it('dirty：未修改 false，修改后 true', () => {
    const d = createDraft(createChartConfig('bar'))
    expect(isDirty(d)).toBe(false)
    updateDraft(d, (draft) => {
      draft.configure.x = { field: 'cat' }
    })
    expect(isDirty(d)).toBe(true)
  })

  it('Cancel：丢弃草稿恢复 saved，返回是否丢弃过修改', () => {
    const d = createDraft(createChartConfig('bar'))
    updateDraft(d, (draft) => {
      draft.configure.x = { field: 'cat' }
      draft.style.title = 'T'
    })
    expect(cancelDraft(d)).toBe(true)
    expect(isDirty(d)).toBe(false)
    expect(d.draft.style.title).toBeUndefined()
    expect(cancelDraft(d)).toBe(false)
  })

  it('Save(commit)：草稿成为新 saved，返回可写回副本', () => {
    const d = createDraft(createChartConfig('scatter'))
    updateDraft(d, (draft) => {
      draft.configure.x = { field: 'val' }
    })
    const committed = commitDraft(d)
    expect(isDirty(d)).toBe(false)
    expect(committed.configure.x?.field).toBe('val')
    committed.configure.x!.field = 'mutated'
    expect(d.saved.configure.x?.field).toBe('val')
  })

  it('configsEqual / cloneConfig', () => {
    const a = createChartConfig('pie')
    const b = cloneConfig(a)
    expect(configsEqual(a, b)).toBe(true)
    b.style.pie = { ...b.style.pie, innerRadiusPct: 50 }
    expect(configsEqual(a, b)).toBe(false)
  })
})

describe('debounce（150ms 预览）', () => {
  it('多次调用只执行最后一次', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 150)
    d.call(1)
    d.call(2)
    d.call(3)
    vi.advanceTimersByTime(149)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
    vi.useRealTimers()
  })

  it('flush 立即执行挂起调用', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 150)
    d.call('x')
    d.flush()
    expect(fn).toHaveBeenCalledWith('x')
    vi.useRealTimers()
  })

  it('cancel 取消挂起调用', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 150)
    d.call('x')
    d.cancel()
    vi.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
