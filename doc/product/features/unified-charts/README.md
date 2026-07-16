# 统一图表功能点（产品依据 · 定稿）

合并 LabKey + Benchling 已确认能力后的**唯一图表开发依据**。

> 冲突决议：[conflicts.md](./conflicts.md)  
> UI 分层：**CONFIGURE + STYLE**  
> 细则粒度：已按 LabKey `../charts/` 控件级补强，并叠加 Benchling/决议增量

## 文档列表

| 文档 | 说明 |
| --- | --- |
| [common.md](./common.md) | 共性 CONFIGURE/STYLE、误差棒、拟合总述 |
| [bar-charts.md](./bar-charts.md) | Bar（含 LabKey 外观/聚合/误差棒 + 水平/堆叠） |
| [box-plots.md](./box-plots.md) | Box（含渲染规则/Hover；无 Jitter） |
| [line-charts.md](./line-charts.md) | Line + 拟合套件（无 Hide Points/线宽/误差棒） |
| [pie-charts.md](./pie-charts.md) | Pie（含百分比阈值；无渐变） |
| [scatter-plots.md](./scatter-plots.md) | Scatter + Size/拟合（无密度） |
| [heatmaps.md](./heatmaps.md) | Heatmap（承接密度场景） |
| [conflicts.md](./conflicts.md) | 冲突裁定 |

## LabKey 细节覆盖核对

| LabKey 专章能力 | 统一文档 | 说明 |
| --- | :---: | --- |
| Bar 聚合枚举/胶囊文案/Group By/误差棒/柱描边 Opacity·线宽·线色/色板/Range/导出图 | ✅ | Series=Group By；+水平/堆叠 |
| Box Color/Shape/Show Points/点线填充/Hover/1.5×IQR 规则/Log·Range | ✅ | **无 Jitter**（决议） |
| Line 双 Y/Number of Charts/Scale·Range/聚合/趋势悬停/分 Series 拟合 | ✅ | Fit 收束为四模型；**无** Hide Points/线宽/点大小/**误差棒** |
| Pie Categories/双半径/百分比阈值与字色/色板 | ✅ | +非 Count；**无 Gradient** |
| Scatter 双 Y/Color·Shape/Jitter/分面/轴 Scale·Range | ✅ | +Size/拟合；**无密度三项**→Heatmap |
| LabKey 密度 Layout | ❌→Heatmap | 决议 12B |

源截图链接已保留在各统一专章中，便于对照开发。

## 纳入 / 排除摘要

| 类别 | 纳入 | 排除 |
| --- | :---: | --- |
| 共性 | CONFIGURE/STYLE 全套控件级、PDF/PNG、抽样、View Type 切换、工作区 Save | Custom code；列映射误差棒；SPLIT 单列 |
| 拟合 | Line+Scatter：PtP/Linear/Quadratic/4PL、打标、MODEL TABLES | 独立 Regression 图种；3PL/5PL |

## 溯源

| 目录 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey 细化原文 |
| [`../benchling-charts/`](../benchling-charts/) | Benchling 细化原文 |

## 相关需求

[`../../requirements/table-chart-integration.md`](../../requirements/table-chart-integration.md)
