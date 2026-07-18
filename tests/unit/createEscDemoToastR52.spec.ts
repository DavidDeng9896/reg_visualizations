import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { FOCUS_RESTORE_RING_CLASS, restoreFocusEl } from '@/shared/ui/focusRestore'
import { resolveCreateRestoreFocus } from '@/modules/analysis/createAnalysisHandoff'
import {
  applyDemoFailCreateFocus,
  createEscDemoToastR52Regression,
  demoFailCreateEscRestoresRingWithToast,
  demoFailToastMessage,
} from '@/modules/analysis/demoFailToastCreate'

describe('Create Esc × Demo-fail toast regression (Round 52)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Round 52 Create Esc × Demo-fail toast regression contract', () => {
    expect(demoFailCreateEscRestoresRingWithToast()).toBe(true)
    expect(createEscDemoToastR52Regression()).toBe(true)
  })

  it('restores Create CTA ring after Esc while Demo-fail toast stays interactive', () => {
    document.body.innerHTML = `
      <div class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create Analysis</button>
      </div>
    `
    toast('error', demoFailToastMessage())
    applyDemoFailCreateFocus()

    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    const overlay = document.createElement('div')
    overlay.setAttribute('data-ia-create', '1')
    document.body.appendChild(overlay)
    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Create Esc → close → onUnmounted restore (shared path with Cancel)
    overlay.remove()
    setToastHostExternalInert(false)
    restoreFocusEl(create, () => resolveCreateRestoreFocus(null), { visibleRing: true })

    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')?.textContent).toContain('Demo 创建失败')
  })
})
