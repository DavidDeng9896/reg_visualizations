import { afterEach, describe, expect, it } from 'vitest'
import {
  demoSuccessFocusTargetId,
  demoSuccessLandsWorkspaceFocus,
  demoSuccessToastCoexistsWithRouteFocus,
  demoSuccessToastMessage,
} from '@/modules/analysis/demoSuccessFocus'
import { focusAfterNavigation, resolveRouteFocusTarget } from '@/shared/ui/routeFocus'
import { toast } from '@/shared/ui/feedback'
import { demoSuccessPathWarmsCreate } from '@/modules/analysis/createAnalysisChunk'

describe('Demo success focus landing (Round 52)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents Demo success lands workspace focus and leaves Create unwarmed', () => {
    expect(demoSuccessLandsWorkspaceFocus()).toBe(true)
    expect(demoSuccessFocusTargetId()).toBe('workspace-main')
    expect(demoSuccessToastMessage()).toBe('已创建 Demo Analysis')
    expect(demoSuccessToastCoexistsWithRouteFocus()).toBe(true)
    expect(demoSuccessPathWarmsCreate()).toBe(false)
  })

  it('lands focus on workspace-main after Demo success toast (routeFocus)', () => {
    document.body.innerHTML = `
      <main id="workspace-main" tabindex="-1">
        <p>workspace</p>
      </main>
    `
    toast('success', demoSuccessToastMessage())
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

    const landed = focusAfterNavigation()
    expect(landed?.id).toBe('workspace-main')
    expect(document.activeElement).toBe(landed)
    expect(resolveRouteFocusTarget()?.id).toBe(demoSuccessFocusTargetId())
    expect(host.querySelector('.ia-toast--success')?.textContent).toContain('已创建 Demo Analysis')
  })
})
