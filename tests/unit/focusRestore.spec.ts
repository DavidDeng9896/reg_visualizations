import { describe, expect, it } from 'vitest'
import { captureFocusEl, restoreFocusEl } from '@/shared/ui/focusRestore'

describe('focusRestore', () => {
  it('captures the active element when it is an HTMLElement (Round 33)', () => {
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    btn.focus()
    expect(captureFocusEl()).toBe(btn)
    btn.remove()
  })

  it('restores focus when the captured element is still in the document', () => {
    const a = document.createElement('button')
    const b = document.createElement('button')
    document.body.append(a, b)
    a.focus()
    const captured = captureFocusEl()
    b.focus()
    expect(document.activeElement).toBe(b)
    restoreFocusEl(captured)
    expect(document.activeElement).toBe(a)
    a.remove()
    b.remove()
  })

  it('uses fallback when captured element was removed', () => {
    const a = document.createElement('button')
    const fallback = document.createElement('button')
    document.body.append(a, fallback)
    a.focus()
    const captured = captureFocusEl()
    a.remove()
    restoreFocusEl(captured, () => fallback)
    expect(document.activeElement).toBe(fallback)
    fallback.remove()
  })

  it('no-ops when nothing to restore', () => {
    expect(() => restoreFocusEl(null)).not.toThrow()
    expect(() => restoreFocusEl(null, () => null)).not.toThrow()
  })
})
