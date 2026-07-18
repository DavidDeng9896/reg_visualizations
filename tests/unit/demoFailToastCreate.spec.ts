import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import {
  demoFailToastCreateCoexists,
  demoFailToastMessage,
} from '@/modules/analysis/demoFailToastCreate'
import { createOverlayBlocksToastHost } from '@/modules/analysis/createToastInert'

describe('Demo failure toast × Create (Round 40)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
  })

  it('documents Demo-fail toast and Create overlay coexistence', () => {
    expect(demoFailToastCreateCoexists()).toBe(true)
    expect(createOverlayBlocksToastHost()).toBe(true)
    expect(demoFailToastMessage()).toBe('Demo 创建失败，请刷新后重试')
  })

  it('keeps Demo error toast inert while Create Analysis owns the layer', () => {
    toast('error', demoFailToastMessage())
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)
    expect(document.querySelector('.ia-toast--error')).toBeTruthy()

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    // Esc must not dismiss toast while Create owns the layer
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast--error')).toBeTruthy()

    setToastHostExternalInert(false)
    expect(host.hasAttribute('inert')).toBe(false)
  })
})
