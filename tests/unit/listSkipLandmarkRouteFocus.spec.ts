import { afterEach, describe, expect, it } from 'vitest'
import {
  focusAfterNavigation,
  shouldSkipRouteFocus,
} from '@/shared/ui/routeFocus'
import { listSkipLandmarkFocusProtected } from '@/modules/analysis/listFocusOrder'

describe('list skip landmark × routeFocus (Round 46)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents protecting the list-main landmark itself after skip lands', () => {
    expect(listSkipLandmarkFocusProtected()).toBe(true)
  })

  it('does not steal focus when #analysis-list-main itself holds focus after skip', () => {
    document.body.innerHTML = `
      <h1 tabindex="-1">Insight Analysis</h1>
      <table id="analysis-list-main" tabindex="-1"><tbody><tr><td>row</td></tr></tbody></table>
    `
    const main = document.getElementById('analysis-list-main')!
    main.focus()
    expect(shouldSkipRouteFocus(document)).toBe(true)
    expect(focusAfterNavigation(document)).toBeNull()
    expect(document.activeElement).toBe(main)
  })

  it('still allows routeFocus when a child control inside list-main is focused', () => {
    document.body.innerHTML = `
      <h1 tabindex="-1">Insight Analysis</h1>
      <div id="analysis-list-main" tabindex="-1"><button type="button">row</button></div>
    `
    const row = document.querySelector('button')!
    row.focus()
    expect(shouldSkipRouteFocus(document)).toBe(false)
    expect(focusAfterNavigation(document)?.tagName).toBe('H1')
  })
})
