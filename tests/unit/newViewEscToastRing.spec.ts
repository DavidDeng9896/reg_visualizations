import { afterEach, describe, expect, it } from 'vitest'
import {
  applyNewViewCancelFocus,
  newViewEscRestoresRingWithToast,
} from '@/modules/sidebar/newViewCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('New view Esc × toast ring regression (Round 57)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents New view Esc using the same restore ring × toast contract as Cancel', () => {
    expect(newViewEscRestoresRingWithToast()).toBe(true)
  })

  it('restores New view opener with ring after Esc and re-enables toast', () => {
    document.body.innerHTML = `
      <button type="button" class="btn empty-cta" aria-label="新建视图">New view</button>
    `
    const opener = document.querySelector('[aria-label="新建视图"]') as HTMLButtonElement
    toast('info', '已保存布局')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Esc closes New view via the same restore path as Cancel
    setToastHostExternalInert(false)
    applyNewViewCancelFocus(opener)

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
