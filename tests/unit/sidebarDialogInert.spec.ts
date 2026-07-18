import { describe, expect, it } from 'vitest'
import { sidebarChromeInert } from '@/modules/sidebar/sidebarDialogInert'

describe('sidebarDialogInert', () => {
  it('marks sidebar chrome inert while the New view dialog is open (Round 31)', () => {
    expect(sidebarChromeInert(true)).toBe(true)
    expect(sidebarChromeInert(false)).toBe(false)
  })

  it('ORs any workspace / feedback overlay layer (Round 32)', () => {
    expect(sidebarChromeInert(false, false, false)).toBe(false)
    expect(sidebarChromeInert(false, true)).toBe(true)
    expect(sidebarChromeInert(false, false, true, false)).toBe(true)
    expect(sidebarChromeInert(true, false, false)).toBe(true)
  })
})
