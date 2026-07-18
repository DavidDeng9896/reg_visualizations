import { afterEach, describe, expect, it } from 'vitest'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import {
  demoFailRestoresCreateFocus,
  demoFailCreateFocusSelector,
  applyDemoFailCreateFocus,
} from '@/modules/analysis/demoFailToastCreate'

describe('Demo fail → Create focus ring (Round 42)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents restoring Create CTA with a visible ring after Demo fails', () => {
    expect(demoFailRestoresCreateFocus()).toBe(true)
    expect(demoFailCreateFocusSelector()).toBe('.create-trigger')
  })

  it('focuses the Create trigger and paints the restore ring', () => {
    document.body.innerHTML = `
      <button type="button" class="btn">一键 Demo</button>
      <button type="button" class="btn btn-primary create-trigger">+ Create Analysis</button>
    `
    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    applyDemoFailCreateFocus()
    expect(document.activeElement).toBe(create)
    expect(create.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
