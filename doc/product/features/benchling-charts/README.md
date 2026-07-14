# Benchling 图表功能点初稿（待确认）

> 来源参考：[`../../reference/benchling/analyze-data-with-benchling-analysis.md`](../../reference/benchling/analyze-data-with-benchling-analysis.md)  
> 原文：[Analyze data with Benchling Analysis](https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis)  
> 状态：**仅列功能点初稿**，请勾选需保留项后再细化

## 说明

Benchling Analysis 在文档中对图表配置采用**统一侧边栏模型**：

- **Configure**：轴 / Series 等数据映射  
- **Style**：颜色、点样式、图例等外观  

除 Regression 外，多数外观项写明适用于各图表类型。原文**未像 LabKey 那样按图种拆开**列出全部专属控件；初稿因此包含：

1. **共性配置**（所有标准图共享）  
2. **各图种要点**（原文明确提到的差异 + 适用共性项）  
3. **Regression**（Advanced Analysis，配置更细）

请在各文件中用 `- [ ]` / `- [x]` 勾选需要纳入产品细化的要点。

## 文档列表

| 文档 | 内容 |
| --- | --- |
| [common.md](./common.md) | 共性：View Type、Configure、Style、Apply |
| [bar-charts.md](./bar-charts.md) | Bar chart |
| [line-charts.md](./line-charts.md) | Line chart |
| [scatter-plots.md](./scatter-plots.md) | Scatter plot |
| [box-plots.md](./box-plots.md) | Box plot |
| [pie-charts.md](./pie-charts.md) | Pie chart |
| [heatmaps.md](./heatmaps.md) | Heatmap |
| [regressions.md](./regressions.md) | Regression（含模型/权重/可视化打标） |

## 与 LabKey 产品功能点的关系

| 路径 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey 调研后**已确认并细化**的产品依据 |
| `benchling-charts/`（本目录） | Benchling 调研**初稿**，待你确认后再细化 |

二者可对照吸收，不自动合并范围。
