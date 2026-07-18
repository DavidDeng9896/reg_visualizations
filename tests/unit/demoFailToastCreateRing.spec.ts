import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import {
  demoFailToastCreateCoexists,
  demoFailToastMessage,
  demoFailToastKeepsCreateRing,
  applyDemoFailCreateFocus,
} from '@/modules/analysis/demoFailToastCreate'

describe('Demo fail toast × Create ring (Round 43)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents toast + Create focus ring coexistence after Demo fails', () => {
    expect(demoFailToastCreateCoexists()).toBe(true)
    expect(demoFailToastKeepsCreateRing()).toBe(true)
  })

  it('keeps the Create restore ring while the Demo error toast stays visible', () => {
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
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
    // Toast must not steal focus or clear the ring
    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
