/**
 * Whether sidebar chrome (search/tree/footer) should be inert behind a modal.
 * Any open overlay layer (New view / CSV / Combine / Transform / ChartEdit / confirm)
 * wins (Round 32–33).
 */
export function sidebarChromeInert(...layers: boolean[]): boolean {
  return layers.some(Boolean)
}
