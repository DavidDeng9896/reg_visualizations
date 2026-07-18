/** Create Analysis dialog handoff + focus restore (Round 38). */

/**
 * Prefer an explicit restore target (e.g. empty-list Create CTA) over whatever
 * currently has focus — mirrors New view handoff after Teleport to body.
 */
export function resolveCreateRestoreFocus(
  explicit: HTMLElement | null | undefined,
  doc: Document = document,
): HTMLElement | null {
  if (explicit && doc.contains(explicit)) return explicit
  const fallback = doc.querySelector(createEmptyCtaFallbackSelector())
  if (fallback instanceof HTMLElement && doc.contains(fallback)) return fallback
  return doc.activeElement instanceof HTMLElement ? doc.activeElement : null
}

/** Empty-list Create CTA selector used when the opener unmounted during cancel. */
export function createEmptyCtaFallbackSelector(): string {
  return '.empty-list .empty-cta.btn-primary'
}
