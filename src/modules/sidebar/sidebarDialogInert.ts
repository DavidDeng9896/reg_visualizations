/**
 * Whether sidebar chrome (search/tree/footer) should be inert behind a modal.
 * Any open overlay layer (New view / CSV / Combine / Transform / confirm) wins (Round 32).
 */
export function sidebarChromeInert(...layers: boolean[]): boolean {
  return layers.some(Boolean)
}
