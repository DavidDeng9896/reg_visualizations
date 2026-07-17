/** Schedule a non-urgent callback after paint (idle or short timeout). */
export function warmIdle(run: () => void, timeoutMs = 4000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: timeoutMs })
    return
  }
  setTimeout(run, Math.min(2000, timeoutMs))
}
