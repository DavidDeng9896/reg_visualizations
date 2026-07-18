import { afterEach, describe, expect, it } from 'vitest'
import {
  isListLandmarkFocusTarget,
  listLandmarkMigratesOnEmptyRowsFlip,
  migrateListLandmarkFocus,
  shouldMigrateListLandmarkFocus,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs, listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('list landmark migrate on empty ↔ rows (Round 47)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents migrating focus when empty ↔ rows flips while on the old landmark', () => {
    expect(listLandmarkMigratesOnEmptyRowsFlip()).toBe(true)
  })

  it('detects focus on list-main or empty landmarks (not rows or filter)', () => {
    document.body.innerHTML = `
      <table id="${listMainRegionAttrs().id}" tabindex="-1">
        <tr data-ia-list-row="0" tabindex="0"><td>row</td></tr>
      </table>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1"></div>
      <select data-ia-list-filter></select>
    `
    const main = document.getElementById('analysis-list-main')!
    const empty = document.getElementById('analysis-list')!
    const row = document.querySelector('[data-ia-list-row]')!
    const filter = document.querySelector('[data-ia-list-filter]')!
    expect(isListLandmarkFocusTarget(main)).toBe(true)
    expect(isListLandmarkFocusTarget(empty)).toBe(true)
    expect(isListLandmarkFocusTarget(row)).toBe(false)
    expect(isListLandmarkFocusTarget(filter)).toBe(false)
    expect(isListLandmarkFocusTarget(null)).toBe(false)
  })

  it('migrates when aria-controls target changes and focus was on a landmark', () => {
    const before = { ready: true, hasRows: true }
    const after = { ready: true, hasRows: false }
    expect(shouldMigrateListLandmarkFocus(true, before, after)).toBe(true)
    expect(shouldMigrateListLandmarkFocus(true, after, before)).toBe(true)
    expect(shouldMigrateListLandmarkFocus(false, before, after)).toBe(false)
    expect(shouldMigrateListLandmarkFocus(true, before, before)).toBe(false)
  })

  it('moves focus from destroyed-main scenario onto the empty landmark', () => {
    document.body.innerHTML = `
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region">empty</div>
    `
    const after = { ready: true, hasRows: false }
    const landed = migrateListLandmarkFocus(after)
    expect(landed?.id).toBe('analysis-list')
    expect(document.activeElement).toBe(landed)
  })

  it('moves focus onto list-main after empty → rows', () => {
    document.body.innerHTML = `
      <table id="${listMainRegionAttrs().id}" tabindex="-1">
        <tr data-ia-list-row="0" tabindex="0"><td>row</td></tr>
      </table>
    `
    const after = { ready: true, hasRows: true }
    const landed = migrateListLandmarkFocus(after)
    expect(landed?.id).toBe('analysis-list-main')
    expect(document.activeElement).toBe(landed)
  })
})
