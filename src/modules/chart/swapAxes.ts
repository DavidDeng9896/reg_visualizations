import type { ChartConfigure, ChartStyle } from '@/shared/types/analysis'

/** 一键交换 X/Y 映射及轴级设置（docs/features/charts/common.md） */
export function swapAxesConfigure(configure: ChartConfigure): ChartConfigure {
  return {
    ...configure,
    xField: configure.yField,
    yField: configure.xField,
    xLabel: configure.yLabel,
    yLabel: configure.xLabel,
    xScale: configure.yScale,
    yScale: configure.xScale,
  }
}

/** 交换 STYLE 中的轴 Range 设置，与映射交换一并生效 */
export function swapAxesStyle(style: ChartStyle): ChartStyle {
  return {
    ...style,
    xRangeMode: style.yRangeMode,
    xMin: style.yMin,
    xMax: style.yMax,
    yRangeMode: style.xRangeMode,
    yMin: style.xMin,
    yMax: style.xMax,
  }
}
