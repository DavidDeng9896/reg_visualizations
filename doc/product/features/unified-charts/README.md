# 统一图表功能点（产品依据）

> **状态：合并进行中** — 请先完成 [conflicts.md](./conflicts.md) 勾选，再生成各图细则。  
> 设计说明：[docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md](../../../../docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md)

合并 LabKey + Benchling **已确认**能力后的**唯一产品开发依据**（定稿后）。

## 溯源（非开发依据）

| 目录 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey 细化原文（已合并，仅溯源） |
| [`../benchling-charts/`](../benchling-charts/) | Benchling 细化原文（已合并，仅溯源） |

## 计划文档列表

| 文档 | 状态 |
| --- | --- |
| [conflicts.md](./conflicts.md) | **请勾选** |
| common.md | 待冲突决议后撰写 |
| bar-charts.md | 待写 |
| box-plots.md | 待写 |
| line-charts.md | 待写（含拟合/打标/MODEL TABLES） |
| pie-charts.md | 待写 |
| scatter-plots.md | 待写（含拟合/打标/MODEL TABLES） |
| heatmaps.md | 待写 |

## 已拍板摘要

- UI：CONFIGURE + STYLE  
- 图种：Bar / Box / Line / Pie / Scatter / **Heatmap**  
- 拟合：挂 Line + Scatter；Linear / Quadratic / 4PL + 套索打标 + MODEL TABLES  
- Custom code：不纳入  
- 表+图需求将改挂本目录  

## 相关需求

[`../../requirements/table-chart-integration.md`](../../requirements/table-chart-integration.md)（冲突决议后同步更新）
