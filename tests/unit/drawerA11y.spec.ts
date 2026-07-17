import { describe, expect, it } from 'vitest'
import { nextDrawerTab } from '@/modules/chart/drawerA11y'

describe('nextDrawerTab', () => {
  it('Home/End jump to ends', () => {
    expect(nextDrawerTab('style', 'Home')).toBe('configure')
    expect(nextDrawerTab('configure', 'End')).toBe('style')
  })

  it('Arrow keys wrap between configure and style', () => {
    expect(nextDrawerTab('configure', 'ArrowRight')).toBe('style')
    expect(nextDrawerTab('style', 'ArrowRight')).toBe('configure')
    expect(nextDrawerTab('style', 'ArrowLeft')).toBe('configure')
    expect(nextDrawerTab('configure', 'ArrowLeft')).toBe('style')
  })

  it('ignores unrelated keys', () => {
    expect(nextDrawerTab('configure', 'Enter')).toBe('configure')
    expect(nextDrawerTab('style', 'Tab')).toBe('style')
  })
})
