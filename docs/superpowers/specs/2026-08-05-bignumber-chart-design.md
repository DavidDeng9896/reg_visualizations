# Big Number 图种设计

## 背景

需求：图表需支持大号数字组件，用于展示如「开发中 / 评估中 / CRO 测试」等阶段计数；同一组件内可显示多个数字。

## 方案

新增第一类图种 `bignumber`（Big number），接入现有 chart registry，工作区 / 看板 / 流程图 / AI 工具统一复用 `buildChartOption`。

渲染使用 Plotly `indicator`（`mode: 'number'`），多指标用 `domain` 分栏，不引入第二套渲染链路。

## 映射

两种模式（builder 优先 Metrics）：

1. **Metrics（宽表）**：`values[]`（multiple + aggregatable）——每个度量一个大数字。适合已有 `n_development` / `n_evaluation` 列。
2. **Categories（长表）**：`categories` + 可选 `measure`——每个类别一个大数字。适合 `stage` 列（开发中 / 评估中 / CRO）。

校验：至少配置 Metrics 或 Categories 之一。

## 样式

```ts
bignumber?: {
  layout?: 'row' | 'grid'   // 默认 row；grid 为多行多列
  valueFontSize?: number    // 默认 42
  labelFontSize?: number    // 默认 13
  showLabel?: boolean       // 默认 true
  compact?: boolean         // SI 缩写（1.2k）
}
```

无坐标轴 / 参考线；默认隐藏图例。可用 Series colors 覆盖各指标数字颜色。

## 文件触点

- `shared/types.ts` / `factories.ts`
- `modules/charts/runtime/bignumber.ts` + `registry.ts` + panels + `BaseStyle`
- 侧栏 / 看板 / flowchart 标签与图标
- AI prompts / tools 描述
- 单测 + `docs/features/charts/bignumber-charts.md`
