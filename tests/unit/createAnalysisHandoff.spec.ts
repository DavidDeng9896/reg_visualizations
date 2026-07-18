import { describe, expect, it } from 'vitest'
import {
  createEmptyCtaFallbackSelector,
  createHeaderTriggerSelector,
  createKeyboardCancelRestoresCta,
  resolveCreateRestoreFocus,
} from '@/modules/analysis/createAnalysisHandoff'
import { FOCUS_RESTORE_RING_CLASS, restoreFocusEl } from '@/shared/ui/focusRestore'

describe('createAnalysisHandoff', () => {
  it('prefers an explicit restore target (empty CTA opener) over activeElement (Round 38)', () => {
    const explicit = document.createElement('button')
    explicit.className = 'btn btn-primary empty-cta create-trigger'
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
    cta.className = 'btn btn-primary empty-cta create-trigger'
    empty.appendChild(cta)
    document.body.appendChild(empty)

    const removed = document.createElement('button')
    expect(resolveCreateRestoreFocus(removed)).toBe(cta)
    expect(createEmptyCtaFallbackSelector()).toBe('.empty-list .empty-cta.btn-primary.create-trigger')

    empty.remove()
  })

  it('keyboard cancel restores Create CTA with visible ring (Round 39)', () => {
    expect(createKeyboardCancelRestoresCta()).toBe(true)
    expect(createHeaderTriggerSelector()).toBe('.top-actions .btn-primary.create-trigger')

    const empty = document.createElement('div')
    empty.className = 'empty-list'
    const cta = document.createElement('button')
    cta.className = 'btn btn-primary empty-cta create-trigger'
    empty.appendChild(cta)
    document.body.appendChild(empty)

    const other = document.createElement('button')
    document.body.appendChild(other)
    other.focus()

    restoreFocusEl(null, () => resolveCreateRestoreFocus(null), { visibleRing: true })
    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    document.body.innerHTML = ''
  })
})
