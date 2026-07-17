import { describe, expect, it } from 'vitest'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { preferCancelInitialFocus } from '@/shared/ui/feedbackA11y'

describe('dangerDeleteOptions', () => {
  it('marks delete confirms as danger so Cancel is initial focus', () => {
    const opts = dangerDeleteOptions('删除')
    expect(opts).toEqual({ danger: true, confirmButtonText: '删除' })
    expect(preferCancelInitialFocus(opts)).toBe(true)
    expect(preferCancelInitialFocus(dangerDeleteOptions('移除'))).toBe(true)
  })
})
