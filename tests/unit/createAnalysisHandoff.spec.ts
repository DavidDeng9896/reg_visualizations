import { describe, expect, it } from 'vitest'
import {
  createEmptyCtaFallbackSelector,
  resolveCreateRestoreFocus,
} from '@/modules/analysis/createAnalysisHandoff'

describe('createAnalysisHandoff', () => {
  it('prefers an explicit restore target (empty CTA opener) over activeElement (Round 38)', () => {
    const explicit = document.createElement('button')
    explicit.className = 'btn btn-primary empty-cta'
    const other = document.createElement('button')
    document.body.append(explicit, other)
    other.focus()
    expect(resolveCreateRestoreFocus(explicit)).toBe(explicit)
    expect(resolveCreateRestoreFocus(null)).toBe(other)
    document.body.innerHTML = ''
  })

  it('falls back to empty-list Create CTA when opener unmounted (Round 38)', () => {
    const empty = document.createElement('div')
    empty.className = 'empty-list'
    const cta = document.createElement('button')
    cta.className = 'btn btn-primary empty-cta'
    empty.appendChild(cta)
    document.body.appendChild(empty)

    const removed = document.createElement('button')
    expect(resolveCreateRestoreFocus(removed)).toBe(cta)
    expect(createEmptyCtaFallbackSelector()).toBe('.empty-list .empty-cta.btn-primary')

    empty.remove()
  })
})
