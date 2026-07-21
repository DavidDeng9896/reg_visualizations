import { afterEach, describe, expect, it } from 'vitest'
import {
  applyChartEditCancelFocus,
  chartEditEscRestoresRingWithToast,
  chartEditEscToastR83SpotCheck,
} from '@/modules/chart/chartEditCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('ChartEdit Esc × toast spot-check (Round 83)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 83 ChartEdit Esc × toast spot-check regression', () => {
    expect(chartEditEscToastR83SpotCheck()).toBe(true)
    expect(chartEditEscRestoresRingWithToast()).toBe(true)
  })

  it('restores chart edit trigger with ring after Esc and re-enables toast', () => {
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

    // Esc closes ChartEdit via the same restore path as Cancel
    setToastHostExternalInert(false)
    applyChartEditCancelFocus(opener)

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
