# 统一图表功能点（产品依据 · 定稿）

合并 LabKey + Benchling 已确认能力后的**唯一图表开发依据**。

> 冲突决议：[conflicts.md](./conflicts.md)  
> 设计说明：[docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md](../../../../docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md)  
> UI 分层：**CONFIGURE + STYLE**

## 文档列表

| 文档 | 说明 |
| --- | --- |
| [common.md](./common.md) | 共性 CONFIGURE/STYLE、误差棒规则、拟合总述 |
| [bar-charts.md](./bar-charts.md) | Bar：水平/堆叠、聚合、统计误差棒 |
| [box-plots.md](./box-plots.md) | Box：Color/Shape、Show Points；无 Jitter |
| [line-charts.md](./line-charts.md) | Line + 拟合/打标/MODEL TABLES |
| [pie-charts.md](./pie-charts.md) | Pie：环形、百分比、非 Count；无渐变 |
| [scatter-plots.md](./scatter-plots.md) | Scatter + Size/分面/拟合；无密度 |
| [heatmaps.md](./heatmaps.md) | Heatmap 独立图种 |
| [conflicts.md](./conflicts.md) | 冲突勾选与裁定记录 |

## 纳入 / 排除摘要

| 类别 | 纳入 | 排除 |
| --- | :---: | --- |
| 共性 | CONFIGURE/STYLE、Title/尺寸、Legend、色板、PDF/PNG、抽样提示、View Type 切换、工作区 Save | Custom code；独立 SPLIT；列映射误差棒 |
| Bar | Series、聚合、水平、堆叠/并排、统计误差棒 | — |
| Box | Color/Shape、Show Points、统计规则、统计误差棒 | Jitter |
| Line | Series、双 Y、点形/透明度、对数轴、拟合四模型、打标、MODEL TABLES | Hide Points、线宽、误差棒、Plotly |
| Pie | Categories、非 Count、内径、百分比 | Gradient |
| Scatter | Color/Shape、Size、Jitter、双 Y、分面、统计误差棒、拟合套件、Legend | 密度 Layout、水平误差列 |
| Heatmap | 行列坐标、连续色阶、标注、聚类排序 | Flowchart I/O |
| 拟合 | 挂 Line+Scatter；Linear/Quadratic/4PL/Point-to-Point | 独立 Regression 图种；3PL/5PL |

## 溯源（非开发依据）

| 目录 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey 细化原文 |
| [`../benchling-charts/`](../benchling-charts/) | Benchling 细化原文 |

## 相关需求

[`../../requirements/table-chart-integration.md`](../../requirements/table-chart-integration.md)
