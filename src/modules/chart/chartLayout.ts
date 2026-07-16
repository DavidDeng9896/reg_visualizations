import type { ChartStyle } from '@/shared/types/analysis'

export type LegendOption = {
  show: boolean
  orient?: 'horizontal' | 'vertical'
  left?: number | string
  right?: number | string
  top?: number | string
  bottom?: number | string
  formatter?: (name: string) => string
}

export type GridOption = {
  top: number
  right: number
  bottom: number
  left: number
}

const DEFAULT_GRID: GridOption = { top: 60, right: 40, bottom: 50, left: 60 }

/** 图例显隐 / 方位 / Custom label（common.md STYLE · Legend） */
export function buildLegendOption(style: ChartStyle): LegendOption {
  if (style.legendShow === false) return { show: false }

  const pos = style.legendPosition || 'right'
  const base: LegendOption = {
    show: true,
    orient: pos === 'top' || pos === 'bottom' ? 'horizontal' : 'vertical',
  }

  if (pos === 'left') base.left = 0
  else if (pos === 'right') base.right = 10
  else if (pos === 'top') base.top = 28
  else base.bottom = 0

  const label = style.legendLabel?.trim()
  if (label) {
    base.formatter = (name: string) => `${label} · ${name}`
  }

  return base
}

/** 四边 Margins (px)；defaults 可覆盖缺省右/上等（如 scatter 给图例留白） */
export function buildGridOption(
  style: ChartStyle,
  defaults: Partial<GridOption> = {},
): GridOption {
  const base = { ...DEFAULT_GRID, ...defaults }
  return {
    top: style.marginTop ?? base.top,
    right: style.marginRight ?? base.right,
    bottom: style.marginBottom ?? base.bottom,
    left: style.marginLeft ?? base.left,
  }
}
