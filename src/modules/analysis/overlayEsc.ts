/**
 * Whether a workspace overlay (CSV / Combine / Transform / ChartEdit) may
 * handle Escape to dismiss itself (Round 36).
 *
 * When a native danger/confirm/prompt (`[data-ia-feedback]`) is open on top,
 * Esc must only cancel that dialog — not the underlying Transform/CSV layer.
 */

import { isFeedbackDialogOpen } from '@/shared/ui/feedbackA11y'

export function workspaceOverlayEscAllowed(doc: Document = document): boolean {
  return !isFeedbackDialogOpen(doc)
}
