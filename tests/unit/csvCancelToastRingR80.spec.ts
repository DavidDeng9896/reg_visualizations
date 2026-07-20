import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCsvCancelFocus,
  csvCancelRestoresRingWithToast,
  csvCancelToastR80SpotCheck,
} from '@/modules/table/csvCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('CSV Cancel × toast spot-check (Round 80)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 80 CSV Cancel × toast spot-check regression', () => {
    expect(csvCancelToastR80SpotCheck()).toBe(true)
    expect(csvCancelRestoresRingWithToast()).toBe(true)
  })

  it('restores flowchart/workspace CSV CTA with ring after Cancel and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="ws-empty" tabindex="-1" role="region">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从工作区空态导入 CSV">导入 CSV</button>
      </div>
    `
    const cta = document.querySelector('[aria-label="从工作区空态导入 CSV"]') as HTMLButtonElement
    toast('info', '表已准备')
    const host = document.querySelector('[data-ia-toast-host]')!

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    setToastHostExternalInert(false)
    applyCsvCancelFocus(cta)

    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
