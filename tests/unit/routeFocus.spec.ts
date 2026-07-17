import { describe, expect, it } from 'vitest'
import {
  focusAfterNavigation,
  resolveRouteFocusTarget,
  shouldSkipRouteFocus,
} from '@/shared/ui/routeFocus'

describe('routeFocus', () => {
  it('prefers #workspace-main, then main, then h1', () => {
    const root = document.createElement('div')
    root.innerHTML = `<h1>List</h1><main id="workspace-main" tabindex="-1">Main</main>`
    expect(resolveRouteFocusTarget(root)?.id).toBe('workspace-main')

    root.innerHTML = `<h1>List</h1><main tabindex="-1">Only main</main>`
    expect(resolveRouteFocusTarget(root)?.tagName).toBe('MAIN')

    root.innerHTML = `<h1 tabindex="-1">List only</h1>`
    expect(resolveRouteFocusTarget(root)?.tagName).toBe('H1')

    root.innerHTML = `<div>empty</div>`
    expect(resolveRouteFocusTarget(root)).toBeNull()
  })

  it('focuses the resolved target after navigation', () => {
    document.body.innerHTML = `<main id="workspace-main" tabindex="-1">Workspace</main>`
    const focused = focusAfterNavigation(document)
    expect(focused?.id).toBe('workspace-main')
    expect(document.activeElement).toBe(focused)
    document.body.innerHTML = ''
  })

  it('does not steal focus from skip-link or an already-focused landmark', () => {
    document.body.innerHTML = `
      <a class="skip-link" data-ia-skip="1" href="#workspace-main">跳到主内容</a>
      <main id="workspace-main" tabindex="-1">Workspace</main>
    `
    const skip = document.querySelector<HTMLAnchorElement>('.skip-link')!
    skip.focus()
    expect(shouldSkipRouteFocus(document)).toBe(true)
    expect(focusAfterNavigation(document)).toBeNull()
    expect(document.activeElement).toBe(skip)

    const main = document.querySelector<HTMLElement>('#workspace-main')!
    main.focus()
    expect(shouldSkipRouteFocus(document)).toBe(true)
    expect(focusAfterNavigation(document)).toBeNull()
    expect(document.activeElement).toBe(main)
    document.body.innerHTML = ''
  })

  it('does not steal focus from empty-state skip targets (ws/flow/sidebar/list)', () => {
    for (const id of ['ws-empty', 'flow-empty', 'sidebar-empty', 'analysis-list']) {
      document.body.innerHTML = `
        <main id="workspace-main" tabindex="-1">Main</main>
        <div id="${id}" tabindex="-1" role="region">Empty</div>
      `
      const empty = document.getElementById(id)!
      empty.focus()
      expect(shouldSkipRouteFocus(document)).toBe(true)
      expect(focusAfterNavigation(document)).toBeNull()
      expect(document.activeElement).toBe(empty)
      document.body.innerHTML = ''
    }
  })

  it('does not treat analysis-list-main (table/skeleton) as an empty skip target (Round 31)', () => {
    document.body.innerHTML = `
      <main id="workspace-main" tabindex="-1">Main</main>
      <div id="analysis-list-main" tabindex="-1"><button type="button">row</button></div>
    `
    const row = document.querySelector('button')!
    row.focus()
    expect(shouldSkipRouteFocus(document)).toBe(false)
    expect(focusAfterNavigation(document)?.id).toBe('workspace-main')
    document.body.innerHTML = ''
  })
})
