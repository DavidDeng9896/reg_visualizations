import { describe, expect, it } from 'vitest'
import { sidebarChromeInert } from '@/modules/sidebar/sidebarDialogInert'

describe('sidebarDialogInert', () => {
  it('marks sidebar chrome inert while the New view dialog is open (Round 31)', () => {
    expect(sidebarChromeInert(true)).toBe(true)
    expect(sidebarChromeInert(false)).toBe(false)
  })
})
