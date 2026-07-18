import { afterEach, describe, expect, it } from 'vitest'
import { workspaceOverlayEscAllowed } from '@/modules/analysis/overlayEsc'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { preferCancelInitialFocus } from '@/shared/ui/feedbackA11y'

describe('overlayEsc (Round 36)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback]').forEach((el) => el.remove())
  })

  it('allows Esc on workspace overlays when no feedback dialog is open', () => {
    expect(workspaceOverlayEscAllowed()).toBe(true)
  })

  it('blocks Esc on Transform/CSV while danger confirm owns the layer', () => {
    const root = document.createElement('div')
    root.setAttribute('data-ia-feedback', 'confirm')
    const panel = document.createElement('div')
    panel.setAttribute('data-ia-danger', '1')
    root.appendChild(panel)
    document.body.appendChild(root)

    expect(workspaceOverlayEscAllowed()).toBe(false)
    expect(preferCancelInitialFocus(dangerDeleteOptions('删除'))).toBe(true)

    root.remove()
    expect(workspaceOverlayEscAllowed()).toBe(true)
  })
})
