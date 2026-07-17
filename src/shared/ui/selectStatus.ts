/** Live-region copy for native multi-select selection counts. */

export function multiSelectCountStatus(count: number, label = '已选'): string {
  const n = Math.max(0, Math.floor(count))
  return `${label} ${n} 项`
}
