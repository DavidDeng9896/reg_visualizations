/**
 * 工具参数纠错：模型常把 configure 写成顶层数组，或省略 tableId。
 * 发往上游前 arguments 必须是 JSON 对象（数组会触发豆包 Invalid request body）。
 */

function isFieldMappingLike(v: unknown): boolean {
  return !!v && typeof v === 'object' && 'field' in (v as object)
}

/** 顶层数组 → 对象（按工具名语义）。 */
export function coerceArrayToolArgs(arr: unknown[], toolName?: string): Record<string, unknown> {
  if (toolName === 'submit_plan') return { steps: arr }
  if (toolName === 'mark_step_done' && arr.length === 1 && typeof arr[0] === 'number') {
    return { index: arr[0] }
  }
  if (arr.length && arr.every(isFieldMappingLike)) {
    return { configure: { values: arr } }
  }
  if (arr.every((x) => typeof x === 'string')) {
    if (toolName === 'submit_plan') return { steps: arr }
    return { steps: arr }
  }
  return {}
}

/** 解析后的 args 再按工具名补全常见缺字段。 */
export function coerceParsedToolArgs(
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...args }
  if (toolName === 'set_chart_config') {
    if (!next.configure && Array.isArray(next.values)) {
      next.configure = { values: next.values }
      delete next.values
    }
    if (!next.configure && Array.isArray(next.steps)) {
      next.configure = { values: next.steps }
      delete next.steps
    }
    if (typeof next.field === 'string' && next.field.trim() && !next.configure) {
      next.configure = { values: [{ field: next.field.trim() }] }
      delete next.field
    }
  }
  return next
}
