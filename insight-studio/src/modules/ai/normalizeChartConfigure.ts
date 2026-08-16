/**
 * 将模型常见的「错槽位」图表配置纠正为图种实际槽位，并尽量自动补齐必填映射。
 * - line/scatter/bignumber：y → values[]
 * - bar/box：values[0] → y（若 y 空）
 * - 字符串简写字段 → { field }
 * - 字段名大小写/标题模糊匹配
 * - 缺 x 等必填槽时按列类型启发式补全（避免模型只传 values 反复失败）
 */
import type { ChartConfigure, ColumnMeta, DataType, FieldMapping } from '../../shared/types'
import { mappingSlotsFor } from '../charts/chartSlots'
import type { MappingError } from '../charts/types'

function asMapping(v: unknown): FieldMapping | undefined {
  if (!v) return undefined
  if (typeof v === 'string' && v.trim()) return { field: v.trim() }
  // 模型常把 bar 的 y 写成 [{field, aggregate}] 数组
  if (Array.isArray(v)) {
    for (const item of v) {
      const m = asMapping(item)
      if (m) return m
    }
    return undefined
  }
  if (typeof v === 'object' && v !== null && 'field' in v) {
    const raw = v as FieldMapping & { aggregate?: string }
    const field = String(raw.field ?? '').trim()
    if (!field) return undefined
    const next: FieldMapping = { ...raw, field }
    const agg = raw.aggregation ?? raw.aggregate
    if (typeof agg === 'string' && agg.trim()) {
      next.aggregation = agg.trim() as FieldMapping['aggregation']
    }
    delete (next as { aggregate?: string }).aggregate
    return next
  }
  return undefined
}

function asMappingList(v: unknown): FieldMapping[] | undefined {
  if (v == null) return undefined
  if (!Array.isArray(v)) {
    const one = asMapping(v)
    return one ? [one] : undefined
  }
  const list = v.map(asMapping).filter((m): m is FieldMapping => !!m)
  return list.length ? list : undefined
}

const VALUES_TYPES = new Set(['line', 'scatter', 'bignumber'])
const Y_TYPES = new Set(['bar', 'box'])

const X_NAME_HINT =
  /^(clone|parent|sample|name|id|label|category|group|series|species|campaign|batch|well|antibody|pur)/i

/** 返回浅拷贝后的 configure，不修改入参。 */
export function normalizeAiChartConfigure(
  chartType: string,
  configure: Partial<ChartConfigure>,
): Partial<ChartConfigure> {
  const next: Partial<ChartConfigure> = { ...configure }

  for (const key of ['x', 'y', 'series', 'color', 'shape', 'size', 'categories', 'measure'] as const) {
    if (key in next) {
      const mapped = asMapping(next[key])
      if (mapped) next[key] = mapped
      else delete next[key]
    }
  }
  if ('values' in next) {
    const list = asMappingList(next.values)
    if (list) next.values = list
    else delete next.values
  }

  const type = String(chartType || '')
  if (VALUES_TYPES.has(type)) {
    const hasValues = (next.values ?? []).some((m) => !!m?.field)
    if (!hasValues && next.y?.field) {
      next.values = [next.y]
      delete next.y
    }
  } else if (Y_TYPES.has(type)) {
    if (!next.y?.field && next.values?.[0]?.field) {
      next.y = next.values[0]
    }
  }

  return next
}

/** 按 field / title 不区分大小写解析真实列名。 */
export function resolveColumnField(raw: string, columns: ColumnMeta[]): string | undefined {
  const key = raw.trim()
  if (!key) return undefined
  const exact = columns.find((c) => c.field === key)
  if (exact) return exact.field
  const lower = key.toLowerCase()
  const byField = columns.find((c) => c.field.toLowerCase() === lower)
  if (byField) return byField.field
  const byTitle = columns.find((c) => c.title.toLowerCase() === lower)
  if (byTitle) return byTitle.field
  // 去下划线/空格后再比
  const compact = lower.replace(/[_\s-]+/g, '')
  return columns.find((c) => c.field.toLowerCase().replace(/[_\s-]+/g, '') === compact)?.field
}

function remapField(m: FieldMapping | undefined, columns: ColumnMeta[]): FieldMapping | undefined {
  if (!m?.field) return m
  const resolved = resolveColumnField(m.field, columns)
  if (!resolved) return m
  return resolved === m.field ? m : { ...m, field: resolved }
}

/** 把 configure 里的字段名对齐到真实列 field。 */
export function resolveConfigureFields(
  configure: Partial<ChartConfigure>,
  columns: ColumnMeta[],
): Partial<ChartConfigure> {
  const next: Partial<ChartConfigure> = { ...configure }
  for (const key of ['x', 'y', 'series', 'color', 'shape', 'size', 'categories', 'measure'] as const) {
    if (next[key]) next[key] = remapField(next[key], columns)
  }
  if (next.values?.length) {
    next.values = next.values.map((m) => remapField(m, columns) ?? m)
  }
  return next
}

function usedFields(cfg: Partial<ChartConfigure>): Set<string> {
  const set = new Set<string>()
  for (const key of ['x', 'y', 'series', 'color', 'shape', 'size', 'categories', 'measure'] as const) {
    const f = cfg[key]?.field
    if (f) set.add(f)
  }
  for (const m of cfg.values ?? []) {
    if (m?.field) set.add(m.field)
  }
  return set
}

function pickColumn(
  columns: ColumnMeta[],
  used: Set<string>,
  opts: { preferTypes?: DataType[]; nameHint?: RegExp; preferUnusedNumber?: boolean },
): ColumnMeta | undefined {
  const pool = columns.filter((c) => !used.has(c.field))
  if (!pool.length) return undefined
  const typed = opts.preferTypes?.length
    ? pool.filter((c) => opts.preferTypes!.includes(c.dataType))
    : pool
  const candidates = typed.length ? typed : pool
  if (opts.nameHint) {
    const named = candidates.find((c) => opts.nameHint!.test(c.field) || opts.nameHint!.test(c.title))
    if (named) return named
  }
  return candidates[0]
}

/**
 * 自动补齐图种必填槽。返回补全后的 configure 与补了哪些槽（供摘要）。
 */
export function autofillRequiredChartSlots(
  chartType: string,
  configure: Partial<ChartConfigure>,
  columns: ColumnMeta[],
): { configure: Partial<ChartConfigure>; filled: string[] } {
  const next: Partial<ChartConfigure> = { ...configure }
  if (next.values) next.values = [...next.values]
  const filled: string[] = []
  const used = usedFields(next)
  const type = String(chartType || 'bar')

  const fillX = (preferTypes?: DataType[], useNameHint = true) => {
    if (next.x?.field) return
    const col = pickColumn(columns, used, {
      preferTypes: preferTypes ?? ['string', 'date', 'datetime', 'number'],
      nameHint: useNameHint ? X_NAME_HINT : undefined,
    })
    if (!col) return
    next.x = { field: col.field }
    used.add(col.field)
    filled.push(`x=${col.field}`)
  }

  const fillValues = () => {
    const has = (next.values ?? []).some((m) => !!m?.field)
    if (has) return
    const col = pickColumn(columns, used, { preferTypes: ['number'] })
    if (!col) return
    next.values = [{ field: col.field }]
    used.add(col.field)
    filled.push(`values=${col.field}`)
  }

  const fillY = () => {
    if (next.y?.field) return
    const col = pickColumn(columns, used, { preferTypes: ['number'] })
    if (!col) return
    next.y = { field: col.field }
    used.add(col.field)
    filled.push(`y=${col.field}`)
  }

  if (type === 'scatter' || type === 'line') {
    fillValues()
    if (type === 'scatter') {
      // 缺 x 时优先另一数值列；不要被 clone_id 这类 nameHint 抢走
      fillX(['number'], false)
      if (!next.x?.field) fillX(['string', 'date', 'datetime', 'number'], false)
    } else {
      fillX(['string', 'date', 'datetime', 'number'])
    }
  } else if (type === 'bar') {
    fillX(['string', 'date', 'datetime', 'number'])
    // bar 的 y 可空（计数），不必强填
  } else if (type === 'box') {
    fillY()
  } else if (type === 'pie') {
    if (!next.categories?.field) {
      const col = pickColumn(columns, used, { preferTypes: ['string'], nameHint: X_NAME_HINT })
      if (col) {
        next.categories = { field: col.field }
        used.add(col.field)
        filled.push(`categories=${col.field}`)
      }
    }
  } else if (type === 'heatmap') {
    fillX(['string', 'number'])
    if (!next.y?.field) fillY()
    if (!next.color?.field) {
      const col = pickColumn(columns, used, { preferTypes: ['number'] })
      if (col) {
        next.color = { field: col.field }
        used.add(col.field)
        filled.push(`color=${col.field}`)
      }
    }
  } else if (type === 'bignumber') {
    fillValues()
  }

  return { configure: next, filled }
}

/** 校验失败时给出可执行的下一刀提示。 */
export function formatChartMappingFailHint(
  chartType: string,
  columns: ColumnMeta[],
  errors: MappingError[],
  current: Partial<ChartConfigure>,
): string {
  const msgs = errors.map((e) => e.message).join('；')
  const cols = columns
    .slice(0, 24)
    .map((c) => `${c.field}(${c.dataType})`)
    .join('、')
  const more = columns.length > 24 ? `…共 ${columns.length} 列` : ''
  let example = ''
  try {
    const slots = mappingSlotsFor(chartType)
    const draft: Record<string, unknown> = {}
    const used = usedFields(current)
    for (const slot of slots) {
      if (!slot.required) continue
      if (slot.multiple) {
        const existing = (current.values ?? []).filter((m) => m?.field)
        if (existing.length) {
          draft.values = existing.map((m) => ({ field: m.field }))
        } else {
          const col = pickColumn(columns, used, {
            preferTypes: slot.acceptTypes?.length ? slot.acceptTypes : ['number'],
          })
          if (col) {
            draft.values = [{ field: col.field }]
            used.add(col.field)
          }
        }
      } else if (slot.key === 'x') {
        if (current.x?.field) draft.x = { field: current.x.field }
        else {
          const col = pickColumn(columns, used, {
            preferTypes: slot.acceptTypes?.length ? slot.acceptTypes : ['string', 'number'],
            nameHint: X_NAME_HINT,
          })
          if (col) {
            draft.x = { field: col.field }
            used.add(col.field)
          }
        }
      } else if (slot.key === 'y') {
        if (current.y?.field) draft.y = { field: current.y.field }
        else {
          const col = pickColumn(columns, used, { preferTypes: ['number'] })
          if (col) {
            draft.y = { field: col.field }
            used.add(col.field)
          }
        }
      } else if (slot.key === 'categories') {
        if (current.categories?.field) draft.categories = { field: current.categories.field }
        else {
          const col = pickColumn(columns, used, { preferTypes: ['string'], nameHint: X_NAME_HINT })
          if (col) {
            draft.categories = { field: col.field }
            used.add(col.field)
          }
        }
      } else if (slot.key === 'color' && chartType === 'heatmap') {
        if (current.color?.field) draft.color = { field: current.color.field }
        else {
          const col = pickColumn(columns, used, { preferTypes: ['number'] })
          if (col) {
            draft.color = { field: col.field }
            used.add(col.field)
          }
        }
      }
    }
    example = JSON.stringify({ chartType, configure: draft })
  } catch {
    example = ''
  }
  return [
    `图表映射校验未通过（${chartType}）：${msgs}。`,
    `可用列：${cols}${more}。`,
    example ? `请一次提交完整 configure，例如：${example}` : '请一次提交完整 configure（含全部必填槽）。',
    '不要对同一不完整参数反复调用。',
  ].join(' ')
}
