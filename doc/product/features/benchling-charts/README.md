# Benchling 图表功能点（已合并，仅溯源）

> **不再作为当前产品开发依据。**  
> 统一依据见：[`../unified-charts/`](../unified-charts/)（请先完成 [conflicts.md](../unified-charts/conflicts.md)）

基于 Benchling Analysis 参考原文与截图/GIF 拆帧，对**已确认**功能点完成细化（合并前原文）。

> 原则：紧扣源正文与截图 UI；**未勾选能力不展开**。  
> 参考原文：[`../../reference/benchling/`](../../reference/benchling/)  
> 共性细则：[common.md](./common.md)

## 文档列表

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [common.md](./common.md) | **已细化** | CONFIGURE / STYLE / 工作区共性（含 Error bars） |
| [bar-charts.md](./bar-charts.md) | **已细化** | Bar：聚合、方向、堆叠/并排、误差棒 |
| [line-charts.md](./line-charts.md) | **已细化** | 标准 Line + **Custom code / Plotly 多 Y** |
| [scatter-plots.md](./scatter-plots.md) | **已细化** | Scatter：误差棒（含水平）、Size、Jitter、双 Y |
| [box-plots.md](./box-plots.md) | **已细化** | Box：**已纳入**；Show Points、统计规则；无 Jitter |
| [pie-charts.md](./pie-charts.md) | **已细化** | Pie：环形、百分比、非 Count 聚合 |
| [heatmaps.md](./heatmaps.md) | **已细化** | Heatmap：行列坐标、连续色阶、聚类/标注 |
| [regressions.md](./regressions.md) | **不纳入** | 确认时全部未勾选 |

## 组织方式（与 LabKey `../charts/` 对齐）

1. **已确认范围**（勾选清单 + 排除）  
2. **数据/属性设置（CONFIGURE）**  
3. **布局/外观设置（STYLE）**  
4. **其他设置**  
5. **源命名对照**

## 确认拍板摘要

| 议题 | 结论 |
| --- | --- |
| Error bars 列映射 | **纳入**共性（Bar/Line/Scatter/Box 均开放） |
| Heatmap | **纳入** |
| Regression | **不纳入** |
| Box plot | **纳入**（尽管截图证据弱于正文） |
| Custom code / Plotly 多 Y | **纳入**（挂在 Line 专章高级能力） |

## 纳入 / 排除摘要

| 类别 | 纳入 | 排除（未勾选） |
| --- | :---: | --- |
| 共性 | View Type、X/Y/齿轮/交换、Series、Error bars、色板、Custom label、STYLE、Hover、分屏、抽样提示、SOURCE TABLE | Notebook/Outputs 嵌入锁定 |
| Bar | 聚合、方向、堆叠/并排、轴范围、误差棒、STYLE | （Save/Hover 走 common） |
| Line | 误差棒、对数轴、STYLE；Custom code 多 Trace/多 Y/峰值 | 标准线宽线型、隐藏点 |
| Scatter | 竖直+水平误差棒、Size、Jitter/分箱、双 Y、Point Shape/Opacity、网格 | 本专章 Series Color、Legend |
| Box | Show Points、统计规则 UI、误差棒、STYLE | Jitter |
| Pie | 三槽映射、环形、百分比、非 Count、Color/Legend | — |
| Heatmap | 行列坐标、连续色阶、色阶类型、格内标注、聚类排序、Hover | 独立「颜色度量」专名；Flowchart I/O |
| Regression | — | **全部** |

## 与 LabKey 功能点

| 路径 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey 已确认细化 |
| `benchling-charts/` | Benchling **已确认细化**（本文） |

## 相关需求

表（vxe-table）+ 图表一体化：[`../../requirements/table-chart-integration.md`](../../requirements/table-chart-integration.md)
