# Scatter Plots 功能点（细化版）

> 来源：`doc/reference/labkey/scatterplot.md` + LabKey 官方截图  
> 范围：仅细化已勾选功能点  
> 状态：已细化  
> 说明：Heat Map 不作为独立重点能力；密度相关项按 **Layout 配置项**细化。Developer 不纳入。

**图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### 1. 数据 / 属性设置（Chart Type）
- [x] X Axis / Y Axis
- [x] Second Y Axis（Y Axis Side）
- [x] Color / Shape 分组
- [x] 字段增删与图表类型切换

### 2. 布局 / 外观设置（Chart Layout）
- [x] Title / Subtitle / Width / Height
- [x] Jitter Points / Point Size / Opacity / Color Palette
- [x] Number of Charts
- [x] Group By Density / Grouped Data Shape / Density Color Palette
- [x] Margins
- [x] X/Y Axis Label / Scale / Range

### 3. 其他设置
- [x] 多度量分面（One Per Measure 仍尊重 Y Axis Side）
- [x] 导出 PDF / PNG

---

## 1. 数据 / 属性设置（Chart Type）

入口：**Chart Type** → **Create a plot**。

### 1.1 对话框结构

![createScatter.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=createScatter.png)

| 区域 | 内容 |
| --- | --- |
| 左栏 | Bar / Box / Line / Pie / **Scatter** / Time |
| 中栏 | `X Axis *`、`Y Axis *`、`Color`、`Shape` |
| 右栏 | Columns |
| 底部 | Cancel / Apply；`* Required fields` |

### 1.2 X Axis * / Y Axis *

| 字段 | 必填 | 说明 | 源例 |
| --- | --- | --- | --- |
| X Axis | 是 | 数值横轴 | `CD4` |
| Y Axis | 是 | 数值纵轴；可多度量 | `White Blood Count` |

基础：每个点由 X/Y 数值定位。

### 1.3 Second Y Axis（Y Axis Side）

![scatterSecond.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=scatterSecond.PNG)

| 项 | 说明 |
| --- | --- |
| 添加 | 再拖列到 Y Axis，形成多度量面板 |
| Y Axis Side | 每度量胶囊内左右箭头，指定左/右纵轴 |
| 源例 | `White Blood Count` + `Hemoglobin`（其一设右侧） |
| 观察技巧 | 可先去掉 Color/Shape，更易看清双轴 |

### 1.4 Color / Shape 分组

![scatterMore.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=scatterMore.PNG)

| 绑定 | 说明 |
| --- | --- |
| Color | 按列值着色（源例：Cohort） |
| Shape | 按列值变形（源例：Treatment Group） |
| 图例 | 右上角 key 展示颜色与形状映射 |

### 1.5 字段增删与图表类型切换

| 能力 | 说明 |
| --- | --- |
| 增删 | 悬停 X 清除；拖入新列；Y 可多度量 |
| 类型切换 | 左栏切换时，可尽量保留轴与 Color/Shape（when practical） |
| Apply | 刷新图表 |

---

## 2. 布局 / 外观设置（Chart Layout）

入口：**Chart Layout** → **Customize look and feel**。左侧：`General` / `X-Axis` / `Y-Axis`。

### 2.1 General

![lookFeelScatter.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=lookFeelScatter.PNG)

**左列：**

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title | 文本 + 刷新 | 默认如 Lab Results |
| Subtitle | 文本 | 可选 |
| Width / Height (px) | 数字 | 图幅 |
| Jitter Points | 复选框 | 点抖动，减轻重叠 |
| Opacity | 滑杆 | 点透明度 |
| Point Size | 滑杆 | 点大小 |
| Color Palette | 下拉 + 色板预览 | **Light (default) / Dark / Alternate** |

**右列：**

| 控件 | 选项 | 行为 |
| --- | --- | --- |
| Number of Charts | **One Chart** / **One Per Measure** | 单图或多度量分面 |
| Group by Density | **When # of data points exceeds 10,000** / **Always** | 点分箱/密度聚合开关策略 |
| Grouped Data Shape | **Hexagon** / **Square** | 密度格子形状 |
| Density Color Palette | **Blue & White** / **Heat** / **Single Color**（含色块） | 密度着色；启用后**覆盖**默认色板及其他部分点选项 |
| Margins (px) | Top / Bottom / Right / Left | 四边距 |

> 密度相关是 Layout 能力，不是独立图表类型。本次不把 Heat Map 单列为产品重点，但上述三项仍属已勾选配置。

### 2.2 X-Axis / Y-Axis

| 控件 | 说明 |
| --- | --- |
| Label | 各轴显示名；刷新恢复列名默认 |
| Scale Type | 各轴独立：**Linear** / **Log** |
| Range | 各轴独立：**Automatic** 或 **Manual(min/max)** |

---

## 3. 其他设置

### 3.1 多度量分面与 Y Axis Side

| 设置 | 行为 |
| --- | --- |
| Number of Charts = One Per Measure | 每个 Y 度量单独成图 |
| 与双轴关系 | 分面后**仍尊重**各度量上设置的 Y Axis Side（左/右） |

### 3.2 导出 PDF / PNG

悬停图表右上角：

| 选项 | 说明 |
| --- | --- |
| PDF | 导出 PDF |
| PNG | 导出 PNG |

---

## 源命名对照

| 官方文档用语 | UI 可见标签 |
| --- | --- |
| Group By Density | Group by Density |
| Grouped Data Shape | Hexagon / Square |
| Density Color Palette | Blue & White / Heat / Single Color |
| Number of Charts | One Chart / One Per Measure |
| Y Axis Side | Y Axis Side（左右箭头） |
