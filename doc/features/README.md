# 图表功能点文档（细化版）

基于 `doc/` 下 LabKey 调研原文与官方截图，对已确认功能点完成细化。

> 原则：紧扣源正文与截图 UI（控件名、选项枚举、交互）；未勾选能力不展开。

## 文档列表

| 图表 | 功能点细化 | 调研原文 |
| --- | --- | --- |
| Bar Charts | [bar-charts.md](./bar-charts.md) | [../barchart.md](../barchart.md) |
| Box Plots | [box-plots.md](./box-plots.md) | [../boxplot.md](../boxplot.md) |
| Line Plots | [line-plots.md](./line-plots.md) | [../lineplot.md](../lineplot.md) |
| Pie Charts | [pie-charts.md](./pie-charts.md) | [../piechart.md](../piechart.md) |
| Scatter Plots | [scatter-plots.md](./scatter-plots.md) | [../scatterplot.md](../scatterplot.md) |

## 组织方式

每份文档统一包含：

1. **已确认范围**（勾选清单）
2. **数据/属性设置（Chart Type）**：绑定字段、聚合、分组等 + 创建对话框截图
3. **布局/外观设置（Chart Layout）**：General / 轴选项等 + 布局对话框截图
4. **其他设置**：导出、Hover、趋势线交互、渲染规则等（按勾选）
5. **源命名对照**：文档用语 ↔ UI 标签

## 本次纳入 / 排除摘要

| 类别 | 纳入 | 排除（未勾选） |
| --- | --- | --- |
| 共性 | Title/尺寸/边距/轴标签、导出 PDF·PNG | 保存、入口管理、数据过滤联动 |
| Bar | X/Y/聚合/Group By、色板、误差棒 | 图表类型切换 |
| Box | Color/Shape、Show Points/Jitter、渲染规则、Hover | Developer、图表类型切换 |
| Line | Series、双 Y、Trendline 全套、Hide Points、聚合/误差棒 | Developer、过滤/保存 |
| Pie | Categories、色板、半径/环、百分比、渐变；扩展注明非 Count | 过滤/保存 |
| Scatter | Color/Shape、双 Y、密度布局项、分面 | Developer；Heat Map 不作独立重点 |

## 截图引用说明

细化文档中的图片均使用 LabKey 官方 `wiki-download.view` 原链，与调研原文一致，便于对照 UI。
