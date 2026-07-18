import { describe, expect, it } from 'vitest'
import {
  STYLE_SECTION_IDS,
  nextStyleSection,
  styleSectionNavLabel,
} from '@/modules/chart/styleSectionNav'

describe('styleSectionNav', () => {
  it('lists STYLE section targets in document order (Round 33)', () => {
    expect([...STYLE_SECTION_IDS]).toEqual([
      'style-title',
      'style-layout',
      'style-series',
      'style-axes',
    ])
  })

  it('Home/End jump to first/last STYLE section', () => {
    expect(nextStyleSection('style-series', 'Home')).toBe('style-title')
    expect(nextStyleSection('style-title', 'End')).toBe('style-axes')
  })

  it('Arrow keys cycle STYLE sections', () => {
    expect(nextStyleSection('style-title', 'ArrowDown')).toBe('style-layout')
    expect(nextStyleSection('style-layout', 'ArrowDown')).toBe('style-series')
    expect(nextStyleSection('style-axes', 'ArrowDown')).toBe('style-title')
    expect(nextStyleSection('style-title', 'ArrowUp')).toBe('style-axes')
    expect(nextStyleSection('style-series', 'ArrowUp')).toBe('style-layout')
  })

  it('ignores unrelated keys and unknown ids', () => {
    expect(nextStyleSection('style-title', 'Enter')).toBe('style-title')
    expect(nextStyleSection('nope', 'Enter')).toBe('style-title')
    expect(nextStyleSection('nope', 'ArrowDown')).toBe('style-layout')
  })

  it('exposes short labels for the STYLE jump nav', () => {
    expect(styleSectionNavLabel('style-title')).toBe('Title')
    expect(styleSectionNavLabel('style-layout')).toBe('Layout')
    expect(styleSectionNavLabel('style-series')).toBe('Series')
    expect(styleSectionNavLabel('style-axes')).toBe('Axes')
  })
})
