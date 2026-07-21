/**
 * 色板：分类色板 ≥3 套（Light 默认 / Dark / Alternate）+ 连续色阶 ≥3 套（Heatmap）。
 */

export interface CategoricalPalette {
  id: string
  label: string
  colors: string[]
}

export const CATEGORICAL_PALETTES: CategoricalPalette[] = [
  {
    id: 'light',
    label: 'Light (default)',
    colors: ['#2e5bff', '#1f9d66', '#f79009', '#d92d20', '#7a5af8', '#06aed4', '#e31c79', '#84cc16', '#667085', '#b54708'],
  },
  {
    id: 'dark',
    label: 'Dark',
    colors: ['#1e2a78', '#0e6e45', '#b54708', '#b42318', '#53389e', '#026aa2', '#a11043', '#4e5ba6', '#344054', '#7a2e0e'],
  },
  {
    id: 'alternate',
    label: 'Alternate',
    colors: ['#06aed4', '#f04452', '#84cc16', '#7a5af8', '#f79009', '#0e9384', '#e31c79', '#2e5bff', '#98a2b3', '#1f9d66'],
  },
]

export interface ContinuousPalette {
  id: string
  label: string
  /** 浅 → 深色标。 */
  stops: string[]
}

export const CONTINUOUS_PALETTES: ContinuousPalette[] = [
  { id: 'blues', label: 'Blue-White', stops: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'] },
  { id: 'viridis', label: 'Viridis', stops: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] },
  { id: 'warm', label: 'Warm', stops: ['#fff5f0', '#fdcbac', '#fb6a4a', '#cb181d', '#67000d'] },
  { id: 'greenblue', label: 'Green-Blue', stops: ['#f7fcf0', '#ccebc5', '#7bccc4', '#2b8cbe', '#084081'] },
]

export function getCategoricalPalette(id?: string): CategoricalPalette {
  return CATEGORICAL_PALETTES.find((p) => p.id === id) ?? CATEGORICAL_PALETTES[0]
}

export function getContinuousPalette(id?: string): ContinuousPalette {
  return CONTINUOUS_PALETTES.find((p) => p.id === id) ?? CONTINUOUS_PALETTES[0]
}

/** 系列索引 → 色板循环取色。 */
export function paletteColor(paletteId: string | undefined, index: number): string {
  const p = getCategoricalPalette(paletteId)
  return p.colors[index % p.colors.length]
}
