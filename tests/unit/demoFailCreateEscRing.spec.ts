import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { FOCUS_RESTORE_RING_CLASS, restoreFocusEl } from '@/shared/ui/focusRestore'
import { resolveCreateRestoreFocus } from '@/modules/analysis/createAnalysisHandoff'
import {
  applyDemoFailCreateFocus,
  demoFailCreateEscRestoresRingWithToast,
  demoFailToastMessage,
} from '@/modules/analysis/demoFailToastCreate'

describe('Create Esc × Demo-fail toast ring (Round 46)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Create Esc restoring CTA ring while Demo-fail toast stays', () => {
    expect(demoFailCreateEscRestoresRingWithToast()).toBe(true)
  })

  it('restores Create CTA with ring after Esc and re-enables toast host', () => {
    document.body.innerHTML = `
      <div class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create Analysis</button>
      </div>
    `
    toast('error', demoFailToastMessage())
    applyDemoFailCreateFocus()

    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    // Create open → toast inert (same as list watch)
    const overlay = document.createElement('div')
    overlay.setAttribute('data-ia-create', '1')
    document.body.appendChild(overlay)
    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Simulate Create Esc → close → onUnmounted restore (same path as Cancel)
    overlay.remove()
    setToastHostExternalInert(false)
    restoreFocusEl(create, () => resolveCreateRestoreFocus(null), { visibleRing: true })

    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
  })
})
