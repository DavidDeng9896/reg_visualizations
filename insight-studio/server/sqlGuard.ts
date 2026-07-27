/**
 * SQL 代理：只读查询守卫。
 * 拒绝多语句 / 写操作关键字（启发式，非完整解析器）。
 */
const WRITE_RE =
  /^\s*(with\b[\s\S]*\b(insert|update|delete|merge)\b|(insert|update|delete|drop|alter|create|truncate|grant|revoke|call|exec|execute|replace|load|copy|attach|detach|vacuum|analyze)\b)/i

export function assertReadOnlySelect(sql: string): string {
  const text = sql.trim().replace(/;+\s*$/, '')
  if (!text) throw new Error('请输入 SQL')
  if (text.includes(';')) throw new Error('请一次只执行一条语句')
  if (WRITE_RE.test(text)) throw new Error('仅支持只读查询（SELECT / WITH … SELECT）')
  if (!/^\s*(select|with)\b/i.test(text)) {
    throw new Error('仅支持 SELECT 或 WITH … SELECT')
  }
  return text
}

export const DEFAULT_ROW_LIMIT = 10_000
export const HARD_ROW_CAP = 50_000
