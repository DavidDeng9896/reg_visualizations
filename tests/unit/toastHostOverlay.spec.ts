import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  setToastHostExternalInert,
  toast,
  confirm,
} from '@/shared/ui/feedback'

describe('toast host external inert (Round 33)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-feedback]').forEach((el) => el.remove())
    document.body.style.overflow = ''
  })

  it('marks toast host inert while workspace overlays block the layer', () => {
    toast('info', 'behind workspace dialog')
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast--info')).toBeTruthy()

    setToastHostExternalInert(false)
    expect(host.hasAttribute('inert')).toBe(false)
  })

  it('keeps toast host inert when confirm closes but external overlay remains', async () => {
    toast('info', 'still blocked')
    const host = document.querySelector('[data-ia-toast-host]')!
    setToastHostExternalInert(true)

    const p = confirm('确认', '确认', { type: 'info' })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    expect(host.hasAttribute('inert')).toBe(true)

    const root = document.querySelector('[data-ia-feedback="confirm"]')!
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(p).rejects.toMatchObject({ action: 'cancel' })
    expect(host.hasAttribute('inert')).toBe(true)

    setToastHostExternalInert(false)
    expect(host.hasAttribute('inert')).toBe(false)
  })
})
