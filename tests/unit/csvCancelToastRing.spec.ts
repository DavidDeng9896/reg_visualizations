import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCsvCancelFocus,
  csvCancelRestoresRingWithToast,
} from '@/modules/table/csvCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('CSV Cancel × toast ring (Round 54)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents CSV Cancel restoring opener ring while toast stays interactive', () => {
    expect(csvCancelRestoresRingWithToast()).toBe(true)
  })

  it('restores flowchart/workspace CSV CTA with ring after Cancel and re-enables toast', () => {
    document.body.innerHTML = `
      <div id="flow-empty" tabindex="-1" role="region">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从流程图空态导入 CSV">导入 CSV</button>
      </div>
    `
    const cta = document.querySelector('[aria-label="从流程图空态导入 CSV"]') as HTMLButtonElement
    toast('info', '表已准备')
    const host = document.querySelector('[data-ia-toast-host]')!

    // CSV opens → toast inert (workspace overlay watch)
    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Simulate CSV Cancel restore
    setToastHostExternalInert(false)
    applyCsvCancelFocus(cta)

    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
