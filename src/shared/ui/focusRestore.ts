/**
 * Shared focus capture / restore for native dialogs & drawers (Round 33).
 * Unifies the restore pattern used by feedback confirm/prompt and ChartEditDrawer.
 */

export function captureFocusEl(doc: Document = document): HTMLElement | null {
  const active = doc.activeElement
  return active instanceof HTMLElement ? active : null
}

/**
 * Restore focus to `el` when still mounted; otherwise call `fallback` if provided.
 */
export function restoreFocusEl(
  el: HTMLElement | null | undefined,
  fallback?: () => HTMLElement | null | undefined,
): void {
  if (el && typeof document !== 'undefined' && document.contains(el)) {
    el.focus()
    return
  }
  const alt = fallback?.()
  if (alt && document.contains(alt)) alt.focus()
}
