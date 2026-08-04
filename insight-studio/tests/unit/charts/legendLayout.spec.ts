import { describe, expect, it } from 'vitest'
import { buildLegendLayout, baseLayout, LEGEND_COLLAPSE_WIDTH } from '../../../src/modules/charts/runtime/shared'
import {
  applyLegendClearanceMargin,
  overlapAmount,
  suggestLegendClearance,
} from '../../../src/modules/charts/runtime/legendClearance'
import {
  extractLegendItems,
  layoutForCollapsedLegend,
  legendPosFromLayout,
  shouldCollapseLegend,
} from '../../../src/modules/charts/runtime/legendItems'
import type { ChartStyle } from '../../../src/shared/types'

const baseStyle = (): ChartStyle => ({
  legend: { show: true, position: 'top' },
})

describe('buildLegendLayout', () => {
  it('禁用时不显示图例', () => {
    expect(buildLegendLayout(baseStyle(), false)).toEqual({ showlegend: false })
    expect(buildLegendLayout({ legend: { show: false, position: 'top' } }, true)).toEqual({ showlegend: false })
  })

  it('默认顶部图例使用 container 锚定，避免盖住 paper 绘图区', () => {
    const out = buildLegendLayout(baseStyle(), true, { itemCount: 3 }) as {
      showlegend: boolean
      legend: Record<string, unknown>
    }
    expect(out.showlegend).toBe(true)
    expect(out.legend.xref).toBe('container')
    expect(out.legend.yref).toBe('container')
    expect(out.legend.orientation).toBe('h')
    expect(out.legend.yanchor).toBe('top')
  })

  it('条目再多也保持配置的顶部位置（不自动改右侧）', () => {
    const out = buildLegendLayout(baseStyle(), true, { itemCount: 12 }) as {
      legend: Record<string, unknown>
    }
    expect(out.legend.orientation).toBe('h')
    expect(out.legend.yanchor).toBe('top')
  })

  it('右侧配置保持纵向右对齐', () => {
    const out = buildLegendLayout({ legend: { show: true, position: 'right' } }, true, { itemCount: 4 }) as {
      legend: Record<string, unknown>
    }
    expect(out.legend.orientation).toBe('v')
    expect(out.legend.xanchor).toBe('right')
  })

  it('baseLayout 为右侧图例预留右边距', () => {
    const layout = baseLayout(
      { legend: { show: true, position: 'right' } },
      '',
      { legend: true, legendItemCount: 4 },
    ) as { margin: { r: number }; legend: Record<string, unknown> }
    expect(layout.margin.r).toBeGreaterThanOrEqual(96)
    expect(layout.legend.xref).toBe('container')
  })
})

describe('legend collapse', () => {
  it('小于阈值收起，完整宽度不收起', () => {
    expect(shouldCollapseLegend(LEGEND_COLLAPSE_WIDTH - 1)).toBe(true)
    expect(shouldCollapseLegend(LEGEND_COLLAPSE_WIDTH)).toBe(false)
    expect(shouldCollapseLegend(1200)).toBe(false)
  })

  it('extractLegendItems 跳过 showlegend:false 与无名 trace', () => {
    const items = extractLegendItems([
      { name: 'A', marker: { color: '#111' } },
      { name: 'B', showlegend: false, marker: { color: '#222' } },
      { marker: { color: '#333' } },
      { name: 'C', visible: 'legendonly', line: { color: '#444' } },
    ])
    expect(items.map((i) => i.name)).toEqual(['A', 'C'])
    expect(items[0].color).toBe('#111')
    expect(items[1].visible).toBe(false)
    expect(items[1].traceIndex).toBe(3)
  })

  it('layoutForCollapsedLegend 关闭内嵌图例并收缩边距', () => {
    const next = layoutForCollapsedLegend({
      showlegend: true,
      margin: { t: 80, r: 32, b: 48, l: 64 },
      legend: { orientation: 'h', y: 1, xref: 'container', yref: 'container' },
    })
    expect(next.showlegend).toBe(false)
    expect((next.margin as { t: number }).t).toBe(32)
  })

  it('legendPosFromLayout 识别四向', () => {
    expect(legendPosFromLayout({ legend: { orientation: 'h', y: 1 } })).toBe('top')
    expect(legendPosFromLayout({ legend: { orientation: 'h', y: 0 } })).toBe('bottom')
    expect(legendPosFromLayout({ legend: { orientation: 'v', x: 1 } })).toBe('right')
    expect(legendPosFromLayout({ legend: { orientation: 'v', x: 0 } })).toBe('left')
  })
})

describe('legendClearance', () => {
  it('overlapAmount 计算相交面积', () => {
    expect(
      overlapAmount(
        { left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 },
        { left: 5, right: 15, top: 5, bottom: 15, width: 10, height: 10 },
      ),
    ).toBe(25)
  })

  it('图例压在主图上方时建议加大 top margin', () => {
    const plot = { left: 100, right: 400, top: 80, bottom: 300, width: 300, height: 220 }
    const legend = { left: 110, right: 280, top: 60, bottom: 100, width: 170, height: 40 }
    const c = suggestLegendClearance(legend, plot, 8)
    expect(c?.side).toBe('t')
    expect(c!.delta).toBeGreaterThan(0)
  })

  it('applyLegendClearanceMargin 叠加且受 cap 限制', () => {
    const next = applyLegendClearanceMargin({ t: 32, r: 32, b: 48, l: 64 }, { side: 'r', delta: 40 }, { r: 50 })
    expect(next.r).toBe(50)
  })
})
