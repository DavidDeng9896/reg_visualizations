import { describe, expect, it } from 'vitest'
import { buildLegendLayout, baseLayout } from '../../../src/modules/charts/runtime/shared'
import {
  applyLegendClearanceMargin,
  overlapAmount,
  suggestLegendClearance,
} from '../../../src/modules/charts/runtime/legendClearance'
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

  it('条目 ≥8 时顶部自动改为右侧纵向', () => {
    const out = buildLegendLayout(baseStyle(), true, { itemCount: 8 }) as {
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

describe('legendClearance', () => {
  it('overlapAmount 计算相交面积', () => {
    expect(
      overlapAmount(
        { left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 },
        { left: 5, right: 15, top: 5, bottom: 15, width: 10, height: 10 },
      ),
    ).toBe(25)
    expect(
      overlapAmount(
        { left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 },
        { left: 20, right: 30, top: 0, bottom: 10, width: 10, height: 10 },
      ),
    ).toBe(0)
  })

  it('图例压在主图上方时建议加大 top margin', () => {
    const plot = { left: 100, right: 400, top: 80, bottom: 300, width: 300, height: 220 }
    const legend = { left: 110, right: 280, top: 60, bottom: 100, width: 170, height: 40 }
    const c = suggestLegendClearance(legend, plot, 8)
    expect(c?.side).toBe('t')
    expect(c!.delta).toBeGreaterThan(0)
  })

  it('图例压在主图右侧时建议加大 right margin', () => {
    const plot = { left: 100, right: 400, top: 80, bottom: 300, width: 300, height: 220 }
    const legend = { left: 360, right: 480, top: 100, bottom: 260, width: 120, height: 160 }
    const c = suggestLegendClearance(legend, plot, 8)
    expect(c?.side).toBe('r')
    expect(c!.delta).toBeGreaterThan(0)
  })

  it('applyLegendClearanceMargin 叠加且受 cap 限制', () => {
    const next = applyLegendClearanceMargin({ t: 32, r: 32, b: 48, l: 64 }, { side: 'r', delta: 40 }, { r: 50 })
    expect(next.r).toBe(50)
    expect(next.t).toBe(32)
  })
})
