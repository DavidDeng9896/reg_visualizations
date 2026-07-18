/**
 * Shared focus capture / restore for native dialogs & drawers (Round 33–39).
 * Unifies the restore pattern used by feedback confirm/prompt and ChartEditDrawer.
 *
 * Round 39: programmatic restore can paint a temporary visible ring so keyboard
 * users still see where focus landed after Teleport cancel (browsers often omit
 * `:focus-visible` for scripted `.focus()`).
 */

/** Temporary class mirroring `:focus-visible` after programmatic restore. */
export const FOCUS_RESTORE_RING_CLASS = 'ia-restore-focus'

const ringCleanup = new WeakMap<HTMLElement, () => void>()

export function captureFocusEl(doc: Document = document): HTMLElement | null {
  const active = doc.activeElement
  return active instanceof HTMLElement ? active : null
}

/**
 * Paint a temporary focus ring on `el` until blur / pointer / key interaction.
 * Safe to call repeatedly; previous listeners on the same element are replaced.
 */
export function paintFocusRestoreRing(el: HTMLElement): void {
  ringCleanup.get(el)?.()
  el.classList.add(FOCUS_RESTORE_RING_CLASS)

  const clear = () => {
    el.classList.remove(FOCUS_RESTORE_RING_CLASS)
    el.removeEventListener('blur', clear)
    el.removeEventListener('keydown', clear)
    el.removeEventListener('pointerdown', clear)
    ringCleanup.delete(el)
  }

  el.addEventListener('blur', clear)
  el.addEventListener('keydown', clear)
  el.addEventListener('pointerdown', clear)
  ringCleanup.set(el, clear)
}

export type RestoreFocusOptions = {
  /** When true, add a temporary visible ring after focus (Round 39). */
  visibleRing?: boolean
}

/**
 * Restore focus to `el` when still mounted; otherwise call `fallback` if provided.
 */
export function restoreFocusEl(
  el: HTMLElement | null | undefined,
  fallback?: () => HTMLElement | null | undefined,
  options?: RestoreFocusOptions,
): void {
  let target: HTMLElement | null | undefined = null
  if (el && typeof document !== 'undefined' && document.contains(el)) {
    target = el
  } else {
    const alt = fallback?.()
    if (alt && document.contains(alt)) target = alt
  }
  if (!target) return
  target.focus()
  if (options?.visibleRing) paintFocusRestoreRing(target)
}
