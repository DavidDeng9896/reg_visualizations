import { afterEach, describe, expect, it } from 'vitest'
import {
  applyChartEditCancelFocus,
  chartEditCancelRestoresRingWithToast,
  chartEditCancelToastR81SpotCheck,
} from '@/modules/chart/chartEditCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('ChartEdit Cancel × toast spot-check (Round 81)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 81 ChartEdit Cancel × toast spot-check regression', () => {
    expect(chartEditCancelToastR81SpotCheck()).toBe(true)
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
})
