/**
 * Shared options for destructive confirm dialogs (Round 26).
 * Ensures Cancel is the initial focus via preferCancelInitialFocus.
 */

export function dangerDeleteOptions(confirmButtonText = '删除') {
  return {
    danger: true as const,
    confirmButtonText,
  }
}
