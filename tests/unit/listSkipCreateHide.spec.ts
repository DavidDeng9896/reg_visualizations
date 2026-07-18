import { afterEach, describe, expect, it } from 'vitest'
import {
  listSkipHiddenOnCreateOpenRegression,
  listSkipHiddenWhenCreateOpen,
  listSkipVisibleWhenCreateClosed,
  syncListSkipVisibility,
} from '@/modules/analysis/listSkipCreate'

describe('list skip hide × Create open regression (Round 49)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents Create-open skip hide regression contract', () => {
    expect(listSkipHiddenOnCreateOpenRegression()).toBe(true)
    expect(listSkipHiddenWhenCreateOpen(true)).toBe(true)
    expect(listSkipVisibleWhenCreateClosed(true)).toBe(false)
  })

  it('hides the skip-link in the DOM while Create owns the layer', () => {
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
  })
})
