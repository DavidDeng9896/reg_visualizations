# 图表功能点（LabKey · 已合并，仅溯源）

> **不再作为当前产品开发依据。**  
> 统一依据见：[`../unified-charts/`](../unified-charts/)（请先完成 [conflicts.md](../unified-charts/conflicts.md)）

基于 LabKey 调研参考与官方截图，对**已确认**功能点完成细化（合并前原文）。

> 原则：紧扣源正文与截图 UI（控件名、选项枚举、交互）；未勾选能力不展开。  
> 参考原文：[`../../../reference/labkey/`](../../../reference/labkey/)

## 文档列表

| 图表 | 功能点细则 | 参考原文 |
| --- | --- | --- |
| Bar Charts | [bar-charts.md](./bar-charts.md) | [barchart.md](../../../reference/labkey/barchart.md) |
| Box Plots | [box-plots.md](./box-plots.md) | [boxplot.md](../../../reference/labkey/boxplot.md) |
| Line Plots | [line-plots.md](./line-plots.md) | [lineplot.md](../../../reference/labkey/lineplot.md) |
| Pie Charts | [pie-charts.md](./pie-charts.md) | [piechart.md](../../../reference/labkey/piechart.md) |
| Scatter Plots | [scatter-plots.md](./scatter-plots.md) | [scatterplot.md](../../../reference/labkey/scatterplot.md) |

## 组织方式

每份文档统一包含：

1. **已确认范围**（勾选清单）
2. **数据/属性设置（Chart Type）**
3. **布局/外观设置（Chart Layout）**
4. **其他设置**（导出、Hover、趋势线等，按勾选）
5. **源命名对照**（文档用语 ↔ UI 标签）

## 纳入 / 排除摘要

| 类别 | 纳入 | 排除（未勾选） |
| --- | :---: | --- |
| 共性 | Title/尺寸/边距/轴标签、导出 PDF·PNG | 保存、入口管理、图表内过滤 UI |
| Bar | X/Y/聚合/Group By、色板、误差棒 | 图表类型切换 |
| Box | Color/Shape、Show Points/Jitter、渲染规则、Hover | Developer、图表类型切换 |
| Line | Series、双 Y、Trendline、Hide Points、聚合/误差棒 | Developer、过滤/保存 |
| Pie | Categories、色板、半径/环、百分比、渐变；非 Count 扩展 | 过滤/保存 |
| Scatter | Color/Shape、双 Y、密度布局项、分面 | Developer；Heat Map 不作独立重点 |

## 相关需求

表（vxe-table）+ 图表一体化需求：[`../../requirements/table-chart-integration.md`](../../requirements/table-chart-integration.md)
