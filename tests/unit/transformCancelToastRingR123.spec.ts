import { afterEach, describe, expect, it } from 'vitest'
import {
  applyTransformCancelFocus,
  transformCancelRestoresRingWithToast,
  transformCancelToastR123SpotCheck,
} from '@/modules/transform/transformCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('Transform Cancel × toast spot-check (Round 123)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 123 Transform Cancel × toast spot-check regression', () => {
    expect(transformCancelToastR123SpotCheck()).toBe(true)
    expect(transformCancelRestoresRingWithToast()).toBe(true)
  })

  it('restores toolbar Transform trigger with ring after Cancel and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="ws-toolbar">
        <button type="button" aria-label="过滤与转换">过滤与转换</button>
      </div>
    `
    const opener = document.querySelector('[aria-label="过滤与转换"]') as HTMLButtonElement
    toast('info', '视图已更新')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    setToastHostExternalInert(false)
    applyTransformCancelFocus(opener)

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
