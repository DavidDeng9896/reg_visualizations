import { afterEach, describe, expect, it } from 'vitest'
import {
  listSkipHiddenWhenCreateOpen,
  listSkipVisibleOnCreateCloseRegression,
  listSkipVisibleWhenCreateClosed,
  syncListSkipVisibility,
} from '@/modules/analysis/listSkipCreate'

describe('list skip restore × Create close (Round 50)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents Create-close skip visibility regression contract', () => {
    expect(listSkipVisibleOnCreateCloseRegression()).toBe(true)
    expect(listSkipHiddenWhenCreateOpen(false)).toBe(false)
    expect(listSkipVisibleWhenCreateClosed(false)).toBe(true)
  })

  it('restores skip-link DOM visibility after Create open→close cycle', () => {
    const skip = document.createElement('a')
    skip.className = 'skip-link'
    skip.setAttribute('data-ia-skip', '1')
    skip.href = '#analysis-list-main'
    skip.textContent = '跳到列表'
    document.body.appendChild(skip)

    syncListSkipVisibility(skip, true)
    expect(skip.hidden).toBe(true)
    expect(skip.getAttribute('aria-hidden')).toBe('true')

    syncListSkipVisibility(skip, false)
    expect(skip.hidden).toBe(false)
    expect(skip.hasAttribute('aria-hidden')).toBe(false)
    expect(listSkipVisibleWhenCreateClosed(false)).toBe(true)
  })
})
