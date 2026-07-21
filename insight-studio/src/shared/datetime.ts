/** 日期时间工具：统一使用 ISO 字符串存储。 */

export function nowIso(): string {
  return new Date().toISOString()
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** ISO → 'YYYY-MM-DD HH:mm'（本地时区）。 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO → 相对时间（'刚刚' / '5 分钟前' / '3 小时前' / '2 天前' / 日期）。 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 0) return formatDateTime(iso)
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return formatDateTime(iso).slice(0, 10)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

/** 宽松解析 date/datetime 单元格为时间戳；无法解析返回 null。 */
export function parseDateLike(v: unknown): number | null {
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  if (!DATE_RE.test(s)) {
    // 允许 'YYYY/M/D' 这类常见写法
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}/.test(s)) return null
  }
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? null : t
}
