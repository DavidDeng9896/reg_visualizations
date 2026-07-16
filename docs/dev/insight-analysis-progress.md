# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-dca1013b-4dcc-4b20-87c4-996dff1da607-c9ca` |
| 阶段 | **优化 Round 1**：布局分隔条 / 窄屏降级 / 分包与虚拟滚动 |
| 上次更新 | 2026-07-16 14:06 |
| 单元 | **14/14 PASS**（含 layout helpers） |
| UI E2E | **10/10 PASS**（修复空态重复按钮后） |
| Build | PASS（echarts / vxe / element-plus 已拆 chunk） |

## 2. Round 1 对齐与改动

对照 `docs/requirements/table-chart-integration.md`：

| 需求 | 状态 |
| --- | --- |
| L-04 表/图分隔条拖拽 + 记住占比 | ✅ `splitRatio` + splitter（键盘可调） |
| L-05 窄屏左右→上下降级提示 | ✅ `<900px` 降级 + banner |
| T-11 虚拟滚动 | ✅ vxe `scroll-y` |
| R4 产物体积 | 🟡 主包已拆；echarts/vxe 仍大但按需加载 |

交互：视图类型中英标签、行列计数、列表空态 CTA、`:focus-visible`、CSV `revokeObjectURL`、图表 `ResizeObserver`。

## 3. 验证命令

```bash
npm test
npm run build
npx tsx tests/e2e/ui-full-10-rounds.mts   # 或 npm run test:e2e:ui
```

## 4. 残余风险 / 下一轮候选

| ID | 描述 | 计划轮次 |
| --- | --- | --- |
| R3 | 4PL 拟合为 demo 级 | Round 3+ |
| R4 | CSS/JS 大包继续瘦身（按需 Element/Vxe） | Round 2 |
| UX-2 | CONFIGURE 字段空态引导更强、工具栏分组 | Round 2 |
| UX-3 | 侧栏拖拽宽度、流程图空态 | Round 2 |
| L-02 表筛选后图防抖重绘 | Round 2 |
| Merge | 每满 3 轮合并到 main | Round 3 |
