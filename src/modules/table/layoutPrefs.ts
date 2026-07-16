const LAYOUT_HINT_DISMISSED_KEY = 'ia.layoutHintDismissed'

export function isLayoutHintDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(LAYOUT_HINT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissLayoutHint(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LAYOUT_HINT_DISMISSED_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearLayoutHintDismissed(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(LAYOUT_HINT_DISMISSED_KEY)
  } catch {
    /* ignore */
  }
}
