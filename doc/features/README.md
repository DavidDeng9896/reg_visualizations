# 图表功能点初稿（待确认）

基于 `doc/` 下 LabKey 调研文档，提取五类科学图表的**属性设置 / 布局设置 / 其他设置**功能要点。

> 当前为**初稿清单**：只列功能点，不展开细则。请确认需要保留/删除/合并的要点后，再进行细节点完善。

## 文档列表

| 图表 | 功能点初稿 | 调研原文 |
| --- | --- | --- |
| Bar Charts | [bar-charts.md](./bar-charts.md) | [../barchart.md](../barchart.md) |
| Box Plots | [box-plots.md](./box-plots.md) | [../boxplot.md](../boxplot.md) |
| Line Plots | [line-plots.md](./line-plots.md) | [../lineplot.md](../lineplot.md) |
| Pie Charts | [pie-charts.md](./pie-charts.md) | [../piechart.md](../piechart.md) |
| Scatter Plots | [scatter-plots.md](./scatter-plots.md) | [../scatterplot.md](../scatterplot.md) |

## 分类说明

每份功能点文档统一按以下三类组织：

1. **数据/属性设置（Chart Type）**：轴绑定、分组、聚合、系列等
2. **布局/外观设置（Chart Layout）**：标题、尺寸、颜色、边距、坐标轴样式等
3. **其他设置**：数据过滤、保存、导出、开发者扩展、特有能力等

## 共性功能一览（跨图对比）

| 功能点 | Bar | Box | Line | Pie | Scatter |
| --- | :---: | :---: | :---: | :---: | :---: |
| 标题 / 副标题 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 宽高 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 边距 Margins | ✓ | ✓ | ✓ | — | ✓ |
| 坐标轴 Label | ✓ | ✓ | ✓ | — | ✓ |
| Y 轴 Scale（线性/对数） | — | ✓ | ✓ | — | ✓ |
| Y/轴 Range（自动/手动） | ✓ | ✓ | ✓ | — | ✓ |
| 颜色调色板 | ✓ | ✓* | ✓* | ✓ | ✓ |
| 点/线透明度与尺寸 | ✓ | ✓ | ✓ | — | ✓ |
| 误差棒 Error Bars | ✓ | — | ✓ | — | — |
| 第二 Y 轴 | — | — | ✓ | — | ✓ |
| 密度/热力图分箱 | — | — | — | — | ✓ |
| 趋势线 Trendline | — | — | ✓ | — | — |
| 点击点 JS 扩展 | — | ✓ | ✓ | — | ✓ |
| 保存 / 导出 PDF·PNG | ✓ | ✓ | ✓ | ✓ | ✓ |

\* Box/Line 以点/线颜色、填充等外观控制为主，不完全等同于调色板选项。

## 请确认

请反馈：

1. 哪些功能点需要保留并细化？
2. 哪些可删除或降级为“非必须”？
3. 是否需要按「实现规格」还是「产品需求说明」风格细化？
4. 是否需要单独一份「五图共性配置模型」文档？
