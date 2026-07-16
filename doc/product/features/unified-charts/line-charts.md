# 统一图表 · Line Charts

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> LabKey 溯源：[`../charts/line-plots.md`](../charts/line-plots.md)  
> **决议 5B**：点形/透明度/对数轴；**无** Hide Points、**无**线宽/点大小（LabKey 有而本产品不纳入）  
> **决议 1A**：Line **无** Error bars  
> **拟合 6B**：Point-to-Point / Linear / Quadratic / 4PL + 打标 + MODEL TABLES

**LabKey 图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=`

---

## 已确认范围

### CONFIGURE
- [x] X Axis * / Y Axis * / Series
- [x] Second Y Axis（Y Axis Side）
- [x] Fit model：Point-to-Point / Linear / Quadratic / 4PL（+ 可选约束）
- [x] Exclude flagged；字段增删；View Type 切换
- [x] 对数轴（Scale）

### STYLE
- [x] Title / Subtitle / Width / Height / Margins
- [x] Opacity / Point Shape（节点）；系列取色；Legend
- [x] Number of Charts（One / One Per Measure）
- [x] X/Y Label；Y Scale / Range；双 Y 时 Left/Right 分栏
- [x] 导出 PDF/PNG；拟合悬停参数

### 排除
- Hide Data Points；Line Width；Point Size（5B）
- Error bars（1A）
- Custom code / Plotly；3PL/5PL；泛型 Polynomial

---

## 1. CONFIGURE

![createLine.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=createLine.png)

| 区域 | 内容 |
| --- | --- |
| 绑定区 | `X Axis *`、`Y Axis *`、`Series`、`Fit model` |
| 底部 | Cancel / Save |

### 1.1 X / Y

| 字段 | 必填 | 说明 | 源例 |
| --- | --- | --- | --- |
| X | 是 | 常为时间/日期或数值 | `Date` |
| Y | 是 | 度量；可追加多度量 | `White Blood Count` |

基础：各 X 处打点并连线；过密时用表筛选控 Series。

### 1.2 Series

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按列取值拆多线（例：Participant ID） |

### 1.3 Second Y Axis

![lineSecond.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineSecond.PNG)

| 项 | 说明 |
| --- | --- |
| 添加 | 再绑一列到 Y；形成第二度量（可不覆盖原度量） |
| Y Axis Side | 度量胶囊左右箭头 → 左/右纵轴 |
| STYLE | 可出现 Y-Axis (Left) / Y-Axis (Right) 分栏 |

### 1.4 Fit model（取代 LabKey Trendline 全集）

![lineTrendAssay.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineTrendAssay.PNG)

| Type | 说明 |
| --- | --- |
| Point-to-Point | 默认连接；非回归；可不写 MODEL VARIABLES |
| Linear | 线性回归 |
| Quadratic | 二次 |
| 4PL | 四参数 logistic；可选渐近/约束 min·max |

**不做：** Polynomial 泛型、3PL/5PL、Alternate 变体。

### 1.5 Exclude flagged / 打标

见 §3；CONFIGURE 提供 Exclude flagged 复选。

### 1.6 字段与类型切换

增删胶囊；类型切换尽量复用绑定；Save 刷新。

---

## 2. STYLE

![lookFeelLine.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lookFeelLine.png)

导航示例：`General` / `X-Axis` / `Y-Axis (Left)` / `Y-Axis (Right)`。

### 2.1 General

| 控件 | 行为 |
| --- | --- |
| Title / Subtitle | 文本 + 刷新（例 Subtitle：Subset of Participants） |
| Width / Height | 图幅 px |
| Opacity | 点透明度 |
| Point Shape | 节点标记形状（5B；**无** Point Size / Line Width / Hide Data Points） |
| Default Color | **无 Series** 时可选默认色（LabKey） |
| 系列取色 / Legend | 同 common |
| Number of Charts | **One Chart** / **One Per Measure** |
| Margins | 四边；长标签可加大 bottom |

### 2.2 X-Axis / Y-Axis

| 控件 | 选项 |
| --- | --- |
| Label | 文本 + 刷新 |
| Scale Type | **Linear** / **Log** |
| Range | Automatic 或 Manual(min/max) |
| Aggregate Method | 可选 None/Sum/Min/Max/Mean/Median（LabKey Line 有；用于点聚合后连线） |
| Error Bars | **不提供**（1A） |

---

## 3. 拟合交互 / 打标 / MODEL TABLES

### 3.1 悬停拟合线

![lineTrendOptions.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=c459ba4e-8ed9-1035-8b1a-fe851e083846&name=lineTrendOptions.png)

显示统计量与拟合参数；可切换模型对比。

### 3.2 作用范围

| 条件 | 行为 |
| --- | --- |
| 有 Series | 每个 distinct series **分别**拟合 |
| 无 Series | 对全部点拟合 |

### 3.3 套索打标

Flag / Clear；comment 必填；× 样式；Exclude flagged 时不参与 Linear/Quadratic/4PL。

### 3.4 MODEL TABLES（6G-1）

| 表 | 内容 |
| --- | --- |
| MODEL VARIABLES | Linear：slope、intercept；4PL：Min、Max、Hill Slope、Inflection（+CI） |
| MODEL OUTPUT | 预测、残差等行 |

底栏/侧栏 Tab：图 / VARIABLES / OUTPUT。

### 3.5 导出

**PDF** / **PNG**。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Fit model | Trendline Type | Regression model |
| Point-to-Point | Point-to-Point | — |
| 4PL | Nonlinear 4PL | 4-parameter logistic |
| Y Axis Side | Y Axis Side | — |
| Number of Charts | One / One Per Measure | — |
