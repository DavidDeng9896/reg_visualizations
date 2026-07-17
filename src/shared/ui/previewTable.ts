/** Helpers for lightweight native preview tables (CSV / Combine). */

export function formatPreviewCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function slicePreviewRows<T>(rows: T[], limit: number): T[] {
  const n = Math.max(0, Math.floor(limit))
  if (!rows.length || n === 0) return []
  return rows.slice(0, n)
}
