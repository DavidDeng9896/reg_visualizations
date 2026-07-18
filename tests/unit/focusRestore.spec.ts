import { describe, expect, it } from 'vitest'
import {
  FOCUS_RESTORE_RING_CLASS,
  captureFocusEl,
  paintFocusRestoreRing,
  restoreFocusEl,
} from '@/shared/ui/focusRestore'

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

  it('paints a temporary visible ring on programmatic restore (Round 39)', () => {
    const a = document.createElement('button')
    const b = document.createElement('button')
    document.body.append(a, b)
    a.focus()
    const captured = captureFocusEl()
    b.focus()
    restoreFocusEl(captured, undefined, { visibleRing: true })
    expect(document.activeElement).toBe(a)
    expect(a.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    a.dispatchEvent(new FocusEvent('blur'))
    expect(a.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(false)
    a.remove()
    b.remove()
  })

  it('paintFocusRestoreRing clears on keydown', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    paintFocusRestoreRing(el)
    expect(el.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(false)
    el.remove()
  })
})
