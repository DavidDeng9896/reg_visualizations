import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCreateCancelFocus,
  createEscRestoresRingWithToast,
  createEscToastR71SpotCheck,
} from '@/modules/analysis/createCancelToast'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'

describe('Create Esc × toast spot-check (Round 71)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 71 Create Esc × toast spot-check regression', () => {
    expect(createEscToastR71SpotCheck()).toBe(true)
    expect(createEscRestoresRingWithToast()).toBe(true)
  })

  it('restores Create CTA with ring after Esc and re-enables toast', () => {
    document.body.innerHTML = `
      <div class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create Analysis</button>
      </div>
    `
    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    toast('info', '列表已刷新')
    const host = document.querySelector('[data-ia-toast-host]')!

    const overlay = document.createElement('div')
    overlay.setAttribute('data-ia-create', '1')
    document.body.appendChild(overlay)
    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Esc closes Create via the same restore path as Cancel
    overlay.remove()
    setToastHostExternalInert(false)
    applyCreateCancelFocus(create)

    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--info')).toBeTruthy()
  })
})
