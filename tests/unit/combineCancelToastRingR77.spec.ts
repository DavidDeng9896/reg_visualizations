import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCombineCancelFocus,
  combineCancelRestoresRingWithToast,
  combineCancelToastR77SpotCheck,
} from '@/modules/table/combineCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('Combine Cancel × toast spot-check (Round 77)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 77 Combine Cancel × toast spot-check regression', () => {
    expect(combineCancelToastR77SpotCheck()).toBe(true)
    expect(combineCancelRestoresRingWithToast()).toBe(true)
  })

  it('restores flowchart/workspace Combine CTA with ring after Cancel and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="flow-empty" tabindex="-1" role="region">
        <button type="button" class="btn empty-cta" aria-label="从流程图空态合并表">合并表</button>
      </div>
    `
    const cta = document.querySelector('[aria-label="从流程图空态合并表"]') as HTMLButtonElement
    toast('info', '表已准备')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    setToastHostExternalInert(false)
    applyCombineCancelFocus(cta)

    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
