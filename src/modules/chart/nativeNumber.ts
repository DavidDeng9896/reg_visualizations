/** Native number / range input helpers for ChartEditDrawer (Round 22). */

/** Display value for optional number binding (undefined/null → empty string). */
export function formatOptionalNumber(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return ''
  return String(v)
}

/** Parse optional number from native `<input type="number">`. Empty → undefined. */
export function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** Clamp a finite number into [min, max]. */
export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Parse a bounded optional number: empty clears; out-of-range values are clamped.
 * Non-finite input returns undefined (same as empty).
 */
export function parseClampedOptionalNumber(
  raw: string,
  min: number,
  max: number,
): number | undefined {
  const n = parseOptionalNumber(raw)
  if (n == null) return undefined
  return clampNumber(n, min, max)
}

/** Parse opacity from `<input type="range">`, clamping into [min, max]. */
export function parseOpacity(raw: string, min = 0.1, max = 1): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return min
  return clampNumber(n, min, max)
}

/** Live-region copy for opacity slider (percent). */
export function opacityLiveStatus(value: number): string {
  const pct = Math.round(clampNumber(value, 0, 1) * 100)
  return `透明度 ${pct}%`
}

/** Announce when a numeric field is outside its allowed range (empty if ok). */
export function numberOutOfRangeStatus(
  label: string,
  value: number | undefined | null,
  min: number,
  max: number,
): string {
  if (value == null || !Number.isFinite(value)) return ''
  if (value < min || value > max) return `${label} 超出范围 ${min}–${max}，已自动纠正或请修正`
  return ''
}
