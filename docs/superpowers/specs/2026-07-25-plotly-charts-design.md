# Design: Insight Studio 图表渲染迁移至 Plotly.js

**分支：** `use_plotly`  
**日期：** 2026-07-25  
**状态：** Draft for review

## 1. 目标与非目标

### 目标

- 将 insight-studio 图表渲染引擎从 **ECharts 5** 替换为 **Plotly.js**。
- **配置契约不变**：`ChartConfig` / CONFIGURE / STYLE 面板 / 色板 / 轴设置 / 系列色覆盖等全部延用。
- **六种图种全量切换**：`bar` | `line` | `scatter` | `box` | `pie` | `heatmap`。
- **回归拟合 overlay 保留**：现有 `fit/` 引擎不改；以 Plotly traces 叠加曲线（含 4PL 等）。
- **导出保留**：PNG / PDF 继续可用（`Plotly.toImage` + 现有 jsPDF 流程）。

### 非目标（本阶段）

- **套索打标（Flag / Clear）**：UI 可保留，交互暂禁用或提示「Plotly 版暂未接入」；相关 e2e 先 skip。
- 不引入双轨（ECharts + Plotly）长期共存；本分支完成后移除 echarts。
- 不抽取通用中间 IR（YAGNI）。
- 不改 pipeline / steps / flowchart / 表视图行为。

## 2. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 切换策略 | 直接替换 ECharts | 分支意图明确；避免双轨成本 |
| Builder 策略 | 重写为 Plotly figure，不做 ECharts→Plotly 薄转换 | `custom.renderItem`（箱线/误差棒）无法机械映射 |
| 配置/UI | 零改或极少改 | 用户明确要求延用设置与配色 |
| 套索 | 暂缓 | 降低第一版风险；交互与 e2e 改动大 |
| 拟合 | 必须保留 | 分析核心；引擎已与渲染库解耦 |

## 3. 架构

### 3.1 保持不变的层

```
ChartConfig (shared/types) ──► panel/** (CONFIGURE/STYLE)
         │                           │
         │                           ▼
         │                    palette.ts / ColorField / PalettePicker
         │                    mapping / aggregate / sampling / draft / fit
         ▼
   registry.buildChartOption(result, config, ...)
```

以下文件**原则上不动**：

- `shared/types.ts` 中 `ChartConfig` / `ChartConfigure` / `ChartStyle`
- `shared/factories.ts` → `createChartConfig`
- `panel/**`（含 PalettePicker、AxisSection、SeriesColorsSection 等）
- `runtime/palette.ts`、`aggregate.ts`、`sampling.ts`、`mapping.ts`
- `draft.ts`、`flags.ts`、`fit/**`、`tables/ModelTables.vue`

### 3.2 必须改写的层

```
runtime/{bar,line,scatter,box,pie,heatmap}.ts  →  产出 Plotly data[] + layout
runtime/shared.ts / axis.ts                    →  去掉 ECharts 片段，映射到 Plotly layout
types.ts                                       →  ChartOption 语义改为 Plotly figure
ChartPanel.vue                                 →  Plotly.newPlot / react
export.ts                                      →  Plotly.toImage
package.json / vite.config.ts                  →  依赖与 vendor chunk
```

### 3.3 数据流（迁移后）

```
ChartView
  watch(result, previewConfig) → registry.buildChartOption(...)
       │
       ▼
  BuildOutput { option: PlotlyFigure, warnings, seriesNames, fits? }
       │
       ▼
  ChartPanel :option → Plotly.react(gd, data, layout, config)
       │
       ▼
  export: Plotly.toImage(gd, { format: 'png', ... })
```

`ChartView.vue` 尽量少改：仍传 `:option`、仍消费 `BuildOutput`；套索相关 props/handlers 改为 no-op 或隐藏入口。

## 4. Plotly Figure 契约

### 4.1 类型

```ts
/** Plotly figure（builder 纯函数产物，交给 ChartPanel 渲染）。 */
export interface PlotlyFigure {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
}

// 兼容现有字段名，避免 ChartView 大改：
export type ChartOption = PlotlyFigure

export interface BuildOutput {
  option: ChartOption
  warnings: string[]
  seriesNames: string[]
  fits?: FitGroupSummary[]
}
```

依赖建议：`plotly.js-dist-min` + `@types/plotly.js`（dev）。若类型摩擦过大，可先用最小本地声明，再收紧。

### 4.2 配置 → Plotly 映射原则

| 现有能力 | Plotly 落点 |
|----------|-------------|
| `configure.palette` + `style.seriesColors` | `marker.color` / `line.color`（继续走 `seriesColor()`） |
| 连续色板（heatmap） | `colorscale` + `colorbar` |
| `style.xAxis/yAxis` label/range/log | `layout.xaxis/yaxis`（`type: 'log'`、`range`、`title`） |
| 标题 / 图例 / 边距 / 尺寸 | `layout.title` / `showlegend` / `margin` / 容器宽高 |
| 误差棒 | `error_y` / `error_x`（替代 ECharts custom series） |
| Box | `type: 'box'`（五数来自现有 aggregate；对齐 whisker 语义） |
| 分面 | `layout` subplots / 多 domain（对齐现有多 grid） |
| 拟合曲线 | 额外 `scatter` mode `lines`（虚线等用 `line.dash`） |
| 行 id（原 `__rowIds`） | `customdata`（为后续套索预留；本阶段可不消费） |

### 4.3 ChartPanel 行为

- 挂载：`Plotly.newPlot`；更新：`Plotly.react`（避免全量销毁）。
- `animation`：关闭或极短（对齐当前 `animation: false`）。
- Resize：监听容器，调用 `Plotly.Plots.resize`。
- `defineExpose({ getDataURL })`：内部 `Plotly.toImage`，保持 ChartView/export 调用面。
- **套索**：`flagMode` 非 `off` 时不启用 select；Flag/Clear 按钮在 ChartView 侧 disabled + tooltip。

### 4.4 导出

- PNG：`Plotly.toImage(gd, { format: 'png', width, height, scale })`。
- PDF：现有 jsPDF 流程不变，输入仍为 PNG data URL。

## 5. 图种迁移要点

| 图种 | 注意点 |
|------|--------|
| pie | 最简单；`hole` 对应 donut |
| bar | 水平/堆叠 → `orientation` / `barmode` |
| line | 多 Y、双轴 → `yaxis`/`yaxis2`；showPoints → `mode` |
| scatter | 尺寸/形状/颜色映射；拟合 + Flagged × 叠加 |
| box | 用自算五数或 Plotly 原生 box；**对齐**现有 whisker/outlier 定义 |
| heatmap | `z` 矩阵 + `colorscale`；替代 `visualMap` |

实施顺序建议：pie → bar → line → scatter（含 fit）→ box → heatmap；可同 PR 内按序落地，不必多分支。

## 6. 套索暂缓方案

- ChartView：Flag/Clear 控件 `disabled`，tooltip：「Plotly 版本暂未支持套索打标」。
- ChartPanel：忽略 `flagMode` 的 brush 逻辑；不发射 `@lasso`。
- E2E：`lassoOnChart` 相关用例 `test.skip` 并注明原因。
- 数据层 `flags.ts` / `ViewNode.flags` **保留**，避免日后接回时迁移成本。

## 7. 依赖与构建

- 新增：`plotly.js-dist-min`（或团队选定的等价包）。
- 移除：`echarts`。
- `vite.config.ts`：`vendor-echarts` → `vendor-plotly`；manualChunks 同步。
- 体积：接受 Plotly 相对更大；若后续需瘦身，再评估 `plotly.js-basic-dist`（需确认 box/heatmap 是否够用——**本设计默认用含 box/heatmap 的 dist**）。

## 8. 测试策略

### 保持（库无关）

- `aggregate` / `mapping` / `draft` / `sampling` / `fit/*` / `flags` 单测。

### 改写

- `*Options.spec.ts`、`fitOverlay.spec.ts`：断言 `data[].type`、`layout.xaxis`、颜色字符串、`customdata` 等 Plotly 形状。
- E2E `chart.spec.ts`：改为断言 Plotly 图容器可见与基础交互；套索用例 skip。

### 验收清单

- [ ] 六图种均可由现有配置面板驱动渲染
- [ ] 切换色板 / 系列色覆盖立即生效
- [ ] 轴 label / range / log 生效
- [ ] scatter/line 拟合曲线与 MODEL TABLES 仍可用
- [ ] PNG/PDF 导出可用
- [ ] Flag/Clear 明确禁用且不报错
- [ ] `npm test` + `typecheck` 通过；套索 e2e skip 有注释
- [ ] 产物中无 echarts 依赖

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| Box/误差棒视觉与现网不完全一致 | 以现有 aggregate 数值为准做对照截图；优先语义正确 |
| Plotly 包体积 | vendor 分包；首屏按需仅在图表视图加载（可选后续优化） |
| 类型不完善 | 最小声明 + 逐步收紧 |
| 分面/双轴细节差异 | 以当前 ECharts 行为为对照用例，逐项对齐 layout |

## 10. 实施边界小结

| 动作 | 范围 |
|------|------|
| 改 | runtime builders、shared/axis 输出、ChartPanel、export、types 注释/形状、vite/package、option 单测、e2e 图表断言 |
| 禁/skip | 套索交互与相关 e2e |
| 不动 | ChartConfig、配置面板、palette 定义、fit 引擎、pipeline/steps |

## 11. 后续（本设计之外）

- Plotly `plotly_selected` / lasso 接回 Flag/Clear。
- 按需换成更小 Plotly 构建或动态 import 优化首包。
