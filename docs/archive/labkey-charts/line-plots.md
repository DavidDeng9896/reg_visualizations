# Line Plots 功能点（细化版）

> 来源：`docs/reference/labkey/lineplot.md` + LabKey 官方截图  
> 范围：仅细化已勾选功能点  
> 状态：已细化

**图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=`

---

## 已确认范围

### 1. 数据 / 属性设置（Chart Type）
- [x] X Axis / Y Axis
- [x] Series
- [x] Second Y Axis（Y Axis Side）
- [x] Trendline 类型（含 Premium / assay 条件）
- [x] 非线性趋势线附加参数（渐近线 min/max）
- [x] 字段增删与图表类型切换

### 2. 布局 / 外观设置（Chart Layout）
- [x] Title / Subtitle / Width / Height
- [x] Point Size / Opacity / Line Width /（Default Color，无 Series 时）
- [x] Hide Data Points
- [x] Number of Charts
- [x] Margins
- [x] X-Axis Label
- [x] Y-Axis Label / Scale / Range / Aggregate Method / Error Bars

### 3. 其他设置
- [x] 趋势线交互（悬停参数）
- [x] 趋势线作用范围
- [x] 导出 PDF / PNG

---

## 1. 数据 / 属性设置（Chart Type）

入口：**Chart Type** → **Create a plot**。

### 1.1 对话框结构

![createLine.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=createLine.png)

| 区域 | 内容 |
| --- | --- |
| 左栏 | Bar / Box / **Line** / Pie / Scatter / Time |
| 中栏 | `X Axis *`、`Y Axis *`、`Series`、`Trendline Type` |
| 右栏 | Columns |
| 底部 | Cancel / Apply |

### 1.2 X Axis * / Y Axis *

| 字段 | 必填 | 说明 | 源例 |
| --- | --- | --- | --- |
| X Axis | 是 | 横轴，常为时间/日期 | `Date` |
| Y Axis | 是 | 纵轴度量；可追加多度量 | `White Blood Count` |

基础行为：每个 X 对应 Y 值打点并连线（类似散点再连线）。全体混在一起时往往难读，通常再配 Series 或过滤。

### 1.3 Series（系列）

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按列的不同取值拆成多条线 |
| 源例 | `Participant ID` → 每位受试者一条线 |
| 注意 | 全量系列可能过密，实践中常配合数据过滤查看子集 |

### 1.4 Second Y Axis（Y Axis Side）

![lineSecond.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineSecond.PNG)

| 项 | 说明 |
| --- | --- |
| 添加方式 | 再拖一列到 Y Axis；形成**第二块面板**，不覆盖原度量 |
| Y Axis Side | 每个 Y 度量胶囊内有左右箭头图标，指定该度量挂在左轴或右轴 |
| 源例 | 保留 WBC，再加 `CD4` 并设为右侧 |
| 效果 | 同一图中可同时看两度量（及 Series）趋势 |

有第二 Y 时，Layout 左侧可出现 **Y-Axis (Left)** / **Y-Axis (Right)** 分栏（见 lookFeelLine 截图导航）。

### 1.5 Trendline 类型

![lineTrendAssay.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineTrendAssay.PNG)

位置：Chart Type 中栏 **Trendline → Type** 下拉。

**可用性：**
- Premium Edition 的 LabKey Server 折线图界面
- LabKey LIMS / Biologics LIMS：当 X 为数值字段时条件可用

**任意数据可用（前三种）：**

| Type |
| --- |
| Point-to-Point（默认） |
| Linear Regression |
| Polynomial |

**仅 assay schema 的表/查询可用（非线性）：**

| Type |
| --- |
| Nonlinear 3PL |
| Nonlinear 3PL (Alternate) |
| Nonlinear 4PL |
| Nonlinear 4PL (Alternate) |
| Nonlinear 5PL |

### 1.6 非线性趋势线附加参数

| 项 | 说明 |
| --- | --- |
| 渐近线 min/max | 选择非线性类型后**条件显示**输入项（源文） |
| 保存 | 保存图表时保留 Trendline 类型，渲染时继续使用 |

### 1.7 字段增删与图表类型切换

| 能力 | 说明 |
| --- | --- |
| 增删字段 | 悬停点 X 删除；拖入新列；Y 可多度量 |
| 左栏切换类型 | 在轴字段仍适用时，可切到其他图表类型复用绑定 |
| Apply | 确认后刷新 |

---

## 2. 布局 / 外观设置（Chart Layout）

入口：**Chart Layout** → **Customize look and feel**。

### 2.1 General

![lookFeelLine.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lookFeelLine.png)

左侧导航可见：`General` / `X-Axis` / `Y-Axis (Left)` / `Y-Axis (Right)` / Developer。

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title | 文本 + 刷新 | 主标题；刷新恢复为源数据集默认名 |
| Subtitle | 文本 | 副标题（示例：Subset of Participants） |
| Width / Height (px) | 数字步进 | 图幅 |
| Opacity | 滑杆 | 点透明度 |
| Point Size | 滑杆 | 点大小 |
| Line Width | 滑杆 | 线宽 |
| Default Color | （源文） | **无 Series** 时可选默认颜色 |
| Hide Data Points | 复选框 | 勾选后只显示折线、隐藏点形状 |
| Number of Charts | 单选 | **One Chart** / **One Per Measure**（多度量时） |
| Margins (px) | Top/Right/Bottom/Left | 可解决日期等长标签与轴名重叠（源例 bottom=85） |

### 2.2 X-Axis

| 控件 | 说明 |
| --- | --- |
| Label | 改显示名；刷新恢复列名默认 |

### 2.3 Y-Axis

![lineError1.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineError1.png)

| 控件 | 选项 |
| --- | --- |
| Label | 文本 + 刷新 |
| Scale Type | **Linear** / **Log** |
| Range | **Automatic**（Min/Max 灰显）或 **Manual**（填 Min/Max） |
| Aggregate Method | 下拉；源文枚举：**None / Sum / Min / Max / Mean / Median**；截图示例为 Mean |
| Error Bars | **None** / **Standard Deviation** / **Standard Error of the Mean** |

> 源文对 Range 另述默认 “Automatic across charts”，并可选 “Automatic Within Chart”。截图为 Automatic / Manual；细化以截图控件为准，并保留源文跨图自动范围语义。

---

## 3. 其他设置

### 3.1 趋势线交互

![lineTrendOptions.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineTrendOptions.png)

| 行为 | 说明 |
| --- | --- |
| 悬停趋势线 | 显示统计量与曲线拟合参数 |
| 多类型对比 | 同源数据可用不同 Trendline Type 呈现（截图展示四种） |

### 3.2 趋势线作用范围

| 条件 | 行为 |
| --- | --- |
| 已选 Series | 对每个 distinct series **分别**套用该 Trendline |
| 未选 Series | 对全部数据点套用 |

### 3.3 导出 PDF / PNG

悬停图表右上角：

| 选项 | 说明 |
| --- | --- |
| PDF | 导出 PDF |
| PNG | 导出 PNG |

---

## 源命名对照

| 官方文档用语 | UI 可见标签 |
| --- | --- |
| Series | Series |
| Y Axis Side | Y Axis Side（左右箭头） |
| Trendline | Trendline → Type |
| Hide Data Points | Hide Data Points |
| Number of Charts | One Chart / One Per Measure |
