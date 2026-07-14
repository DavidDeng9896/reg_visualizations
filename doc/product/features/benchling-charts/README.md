# Benchling 图表功能点初稿（待确认）

> 来源参考：[`../../reference/benchling/analyze-data-with-benchling-analysis.md`](../../reference/benchling/analyze-data-with-benchling-analysis.md)  
> **本轮已对文档内 GIF/PNG 拆帧核对**，配置项比纯正文更完整  
> 状态：**初稿**，请勾选需保留项后再细化

## 说明

Benchling Analysis 图表配置侧栏（截图）：

- Tab **CONFIGURE**：View type、X/Y（含类型图标与齿轮）、Series、**Error bars**、**Color palette**、Filters & Transforms  
- Tab **STYLE**：系列取色、Point Shape/Opacity、Legend（显隐/方位/自定义标题）  
- 底部：**Cancel / Save**；工作区有 **SPLIT WORKSPACE**

GIF 额外可见：Heatmap 行列坐标+色阶+Hover；Regression 套索打标/对数轴/4PL；Custom code 多 Y 折线等。

## 文档列表

| 文档 | 内容 | 视觉证据强度 |
| --- | --- | --- |
| [common.md](./common.md) | 共性 CONFIGURE / STYLE / 工作区 | 强（configure 截图） |
| [bar-charts.md](./bar-charts.md) | Bar | 中（View type 列表） |
| [line-charts.md](./line-charts.md) | Line + Custom code 折线 | 中–强 |
| [scatter-plots.md](./scatter-plots.md) | Scatter + Error bars | **强** |
| [box-plots.md](./box-plots.md) | Box | 弱（正文有、截图下拉未见） |
| [pie-charts.md](./pie-charts.md) | Pie | 中（View type 列表） |
| [heatmaps.md](./heatmaps.md) | Heatmap | **强**（GIF 实图） |
| [regressions.md](./regressions.md) | Regression + Visual flagging | **强**（多图/GIF） |

## 请你确认

在各文件将需要纳入产品的项改为 `- [x]`。尤其请拍板：

1. **Error bars**（列映射）是否作为标准图共性？  
2. **Heatmap / Regression** 是否纳入本产品范围？  
3. **Box plot** 是否保留（截图证据弱）？  
4. **Custom code / Plotly 多 Y** 是否作为高级能力单列？  

确认后进入细节点完善。

## 与 LabKey 产品功能点

| 路径 | 角色 |
| --- | --- |
| [`../charts/`](../charts/) | LabKey **已确认细化** |
| `benchling-charts/` | Benchling **待确认初稿**（含视觉核对） |
