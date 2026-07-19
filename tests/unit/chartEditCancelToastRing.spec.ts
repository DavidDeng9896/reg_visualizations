import { afterEach, describe, expect, it } from 'vitest'
import {
  applyChartEditCancelFocus,
  chartEditCancelRestoresRingWithToast,
} from '@/modules/chart/chartEditCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('ChartEdit Cancel × toast ring (Round 55)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents ChartEdit Cancel restoring opener ring while toast stays interactive', () => {
    expect(chartEditCancelRestoresRingWithToast()).toBe(true)
  })

  it('restores chart edit trigger with ring after Cancel and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="ws-toolbar">
        <button type="button" aria-label="编辑图表">Edit</button>
      </div>
    `
    const opener = document.querySelector('[aria-label="编辑图表"]') as HTMLButtonElement
    toast('info', '图表已更新')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    setToastHostExternalInert(false)
    applyChartEditCancelFocus(opener)

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })

  it('falls back to toolbar control when opener is gone', () => {
    document.body.innerHTML = `
      <div id="ws-toolbar">
        <button type="button">Toolbar</button>
      </div>
    `
    const fallback = document.querySelector('#ws-toolbar button') as HTMLButtonElement
    applyChartEditCancelFocus(null)
    expect(document.activeElement).toBe(fallback)
    expect(fallback.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
