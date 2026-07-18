/** Shared empty-state CTA focus ring class (Round 30). Styles live in main.css. */

export const EMPTY_CTA_FOCUS_CLASS = 'empty-cta'

export function emptyCtaFocusSelector(): string {
  return `.${EMPTY_CTA_FOCUS_CLASS}:focus-visible`
}
