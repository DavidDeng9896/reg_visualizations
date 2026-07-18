import { afterEach, describe, expect, it } from 'vitest'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { createOverlayBlocksToastHost } from '@/modules/analysis/createToastInert'

describe('toast host × Create overlay (Round 39)', () => {
  afterEach(() => {
    setToastHostExternalInert(false)
    document.querySelectorAll('[data-ia-toast-host],[data-ia-create]').forEach((el) => el.remove())
  })

  it('documents Create overlay blocking toast host (list page contract)', () => {
    expect(createOverlayBlocksToastHost()).toBe(true)
  })

  it('marks toast host inert while Create Analysis owns the layer', () => {
    toast('info', 'behind create')
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

    const create = document.createElement('div')
    create.setAttribute('data-ia-create', '1')
    document.body.appendChild(create)

    setToastHostExternalInert(true)
    expect(host.hasAttribute('inert')).toBe(true)

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast--info')).toBeTruthy()

    setToastHostExternalInert(false)
    expect(host.hasAttribute('inert')).toBe(false)
  })
})
