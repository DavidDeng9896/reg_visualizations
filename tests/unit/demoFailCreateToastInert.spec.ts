import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { createOverlayBlocksToastHost } from '@/modules/analysis/createToastInert'
import {
  applyDemoFailCreateFocus,
  demoFailCreateOpenInertsToast,
  demoFailToastKeepsCreateRing,
  demoFailToastMessage,
} from '@/modules/analysis/demoFailToastCreate'

describe('Demo fail Create open × toast inert (Round 44)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Create open inerting Demo-fail toast while keeping the ring contract', () => {
    expect(demoFailCreateOpenInertsToast()).toBe(true)
    expect(demoFailToastKeepsCreateRing()).toBe(true)
    expect(createOverlayBlocksToastHost()).toBe(true)
  })

  it('marks toast inert when Create opens after Demo fail without clearing the toast or ring', () => {
    document.body.innerHTML = `
      <button type="button" class="btn">一键 Demo</button>
      <button type="button" class="btn btn-primary create-trigger">+ Create Analysis</button>
    `
    toast('error', demoFailToastMessage())
    applyDemoFailCreateFocus()

    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)

    // Create Analysis opens (list watch → setToastHostExternalInert(true))
    const overlay = document.createElement('div')
    overlay.setAttribute('data-ia-create', '1')
    document.body.appendChild(overlay)
    setToastHostExternalInert(true)

    expect(host.hasAttribute('inert')).toBe(true)
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
    // Esc must not dismiss toast while Create owns the layer
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
    // Prior Create restore ring remains until Create dialog takes focus
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
