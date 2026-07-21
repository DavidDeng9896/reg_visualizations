/**
 * 映射校验与图种互切迁移（11A：可复用映射保留，无法对齐则清空）。
 */
import type { ChartConfig, ChartConfigure, ChartStyle, ColumnMeta, FieldMapping } from '../../../shared/types'
import type { ChartTypeDefinition, MappingError, SlotDef, SlotKey } from '../types'

/** 读取槽位绑定的字段列表。 */
function slotFields(config: ChartConfig, slot: SlotDef): string[] {
  if (slot.multiple) return (config.configure.values ?? []).map((m) => m.field)
  const m = config.configure[slot.key as keyof ChartConfigure] as FieldMapping | undefined
  return m?.field ? [m.field] : []
}

export function validateMappingWith(
  def: Pick<ChartTypeDefinition, 'mappingSlots'>,
  config: ChartConfig,
  columns: ColumnMeta[],
): MappingError[] {
  const errors: MappingError[] = []
  const colSet = new Set(columns.map((c) => c.field))
  for (const slot of def.mappingSlots) {
    const fields = slotFields(config, slot)
    if (slot.required && fields.length === 0) {
      errors.push({ slot: slot.key, kind: 'required', message: `${slot.label} 为必填项` })
      continue
    }
    for (const f of fields) {
      if (!colSet.has(f)) {
        errors.push({ slot: slot.key, kind: 'missing-column', message: `列「${f}」已不存在（可能已被转换移除）` })
      } else if (slot.acceptTypes?.length) {
        const col = columns.find((c) => c.field === f)!
        if (!slot.acceptTypes.includes(col.dataType)) {
          errors.push({ slot: slot.key, kind: 'missing-column', message: `列「${f}」类型（${col.dataType}）不适用于 ${slot.label}` })
        }
      }
    }
  }
  return errors
}

/* ------------------------------- 11A 迁移 ------------------------------- */

function pick(mapping: FieldMapping | undefined, slot: SlotDef | undefined, columns: ColumnMeta[]): FieldMapping | undefined {
  if (!mapping?.field || !slot) return undefined
  const col = columns.find((c) => c.field === mapping.field)
  if (!col) return undefined
  if (slot.acceptTypes?.length && !slot.acceptTypes.includes(col.dataType)) return undefined
  const next: FieldMapping = { ...mapping }
  if (!slot.aggregatable) delete next.aggregation
  if (!slot.ySide && next.axis) {
    const { side: _side, ...rest } = next.axis
    next.axis = Object.keys(rest).length ? rest : undefined
  }
  return next
}

const slotOf = (def: ChartTypeDefinition, key: SlotKey) => def.mappingSlots.find((s) => s.key === key)

/**
 * 图种互切（11A）：
 * - x→x、y→y（values 首项）、series↔color（2B）、categories↔x、measure↔y、shape/size 保留
 * - 目标槽位不接受该字段类型时清空；不可聚合槽位剥离聚合
 * 返回迁移后的 configure 与是否保留了内容（toast 用）。
 */
export function migrateConfigure(
  from: ChartConfig,
  to: ChartTypeDefinition,
  columns: ColumnMeta[],
): { configure: ChartConfigure; carried: boolean } {
  const src = from.configure
  const firstY = src.values?.[0] ?? src.y
  const out: ChartConfigure = {
    palette: src.palette,
    errorBars: src.errorBars,
    regression: to.capabilities.regression ? (src.regression ?? to.createDefaultConfigure().regression) : undefined,
  }

  const x = pick(src.x ?? src.categories, slotOf(to, 'x'), columns)
  if (x) out.x = x
  const ySingle = pick(firstY ?? src.measure, slotOf(to, 'y'), columns)
  if (ySingle) out.y = ySingle
  const valuesSlot = slotOf(to, 'values')
  if (valuesSlot) {
    const list = (src.values?.length ? src.values : firstY ? [firstY] : [])
      .map((m) => pick(m, valuesSlot, columns))
      .filter((m): m is FieldMapping => !!m)
    if (list.length) out.values = list
  }
  const series = pick(src.series ?? src.color, slotOf(to, 'series'), columns)
  if (series) out.series = series
  const color = pick(src.color ?? src.series ?? src.measure, slotOf(to, 'color'), columns)
  if (color) out.color = color
  const shape = pick(src.shape, slotOf(to, 'shape'), columns)
  if (shape) out.shape = shape
  const size = pick(src.size, slotOf(to, 'size'), columns)
  if (size) out.size = size
  const categories = pick(src.categories ?? src.x, slotOf(to, 'categories'), columns)
  if (categories) out.categories = categories
  const measure = pick(src.measure ?? firstY, slotOf(to, 'measure'), columns)
  if (measure) out.measure = measure

  // Heatmap 默认连续色板；切出 Heatmap 回分类色板
  if (to.type === 'heatmap' && (!out.palette || !isContinuous(out.palette))) out.palette = 'blues'
  if (to.type !== 'heatmap' && out.palette && isContinuous(out.palette)) out.palette = 'light'

  const carried = !!(out.x || out.y || out.values?.length || out.series || out.color || out.categories || out.measure || out.shape || out.size)
  return { configure: out, carried }
}

function isContinuous(id: string): boolean {
  return ['blues', 'viridis', 'warm', 'greenblue'].includes(id)
}

/** 样式迁移：保留通用项（title/subtitle/尺寸/边距/opacity/legend/系列色/轴设置），丢弃图种专属。 */
export function migrateStyle(from: ChartStyle): ChartStyle {
  const { title, subtitle, width, height, margins, opacity, legend, seriesColors, xAxis, yAxis, yAxisRight } = from
  return { title, subtitle, width, height, margins, opacity, legend, seriesColors, xAxis, yAxis, yAxisRight }
}
