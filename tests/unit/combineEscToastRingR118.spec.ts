import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCombineCancelFocus,
  combineEscRestoresRingWithToast,
  combineEscToastR118SpotCheck,
} from '@/modules/table/combineCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('Combine Esc × toast spot-check (Round 118)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 118 Combine Esc × toast spot-check regression', () => {
    expect(combineEscToastR118SpotCheck()).toBe(true)
    expect(combineEscRestoresRingWithToast()).toBe(true)
  })

  it('restores Combine opener with ring after Esc and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="ws-empty" tabindex="-1" role="region">
        <button type="button" class="btn empty-cta" aria-label="从工作区空态合并表">合并表</button>
      </div>
    `
    const cta = document.querySelector('[aria-label="从工作区空态合并表"]') as HTMLButtonElement
    toast('info', '表已准备')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Esc closes Combine via the same restore path as Cancel
    setToastHostExternalInert(false)
    applyCombineCancelFocus(cta)

    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
