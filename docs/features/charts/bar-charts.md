# 统一图表 · Bar Charts

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> LabKey 溯源：[`../../archive/labkey-charts/bar-charts.md`](../../archive/labkey-charts/bar-charts.md)

**LabKey 图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### CONFIGURE
- [x] X Axis Categories（必填）
- [x] Y Axis 度量列（可选；默认 Count）
- [x] Aggregate Method
- [x] Series（= LabKey Group By / Split Categories By）
- [x] 字段增删 / 换位；View Type 切换（11A）
- [x] 柱方向竖直/水平；并排/堆叠（3B）
- [x] 统计 Error bars（1A，Mean → SD/SEM）

### STYLE
- [x] Title / Subtitle / Width / Height / Margins
- [x] Bar 外观：Opacity / Line Width / Line Color
- [x] Fill Color Palette；系列取色；Legend
- [x] Axis Label；Y-Axis Range
- [x] 导出 PDF / PNG

---

## 1. CONFIGURE

侧栏示意对齐 LabKey「Create a plot」信息结构（本产品为 CONFIGURE Tab）：

![createBar.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=createBar.png)

| 区域 | 内容 |
| --- | --- |
| View type | Bar 高亮；可切其它已纳入类型 |
| 绑定区 | `X Axis *`、`Series`、`Y Axis` |
| 列池 | 当前表字段 |
| 底部 | Cancel / Save |

### 1.1 X Axis *（Categories）

| 项 | 说明 |
| --- | --- |
| 必填 | 是 |
| 语义 | 分类列；每个取值对应一组柱 |
| 未设 Y | 柱高 = 该分类匹配行数（**Count**） |
| 源例 | `Cohort` |

### 1.2 Y Axis 度量

![addYtoBar.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=addYtoBar.PNG)

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 胶囊文案 | `Sum of …` / `Mean of …`（聚合名 + 字段名） |
| 作用 | 聚合度量作柱高，替代默认 Count |

### 1.3 Aggregate Method

Y 胶囊内下拉：

| 选项 | 说明 |
| --- | --- |
| Count (non-blank) | 非空计数 |
| Sum | 求和（拖入数值列后常见默认） |
| Min / Max | 最小 / 最大 |
| Mean | 均值 |
| Median | 中位数 |

规则：
- 切换后胶囊文案与 Y 轴默认 Label 自动更新。
- **仅 Mean** 时启用 Error bars（见 1.6）。

### 1.4 Series（LabKey：Group By）

![addSplit.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=addSplit.PNG)

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 效果 | 多系列柱；图例色映射 |
| 与 X | LabKey 示意：Group 取值沿 X 展示、原 X Categories 用颜色区分——产品以实现清晰的分组柱为准 |

### 1.5 方向与堆叠（3B）

| 控件 | 选项 |
| --- | --- |
| 方向 | **竖直**（默认）/ **水平** |
| 分组模式 | Series≠None 时：**并排** / **堆叠** |

### 1.6 Error bars（1A）

![barError1.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=barError1.png)

| 条件 | 选项 |
| --- | --- |
| Aggregate = Mean | None / Standard Deviation / Standard Error of the Mean |
| 其他聚合 | 不可用 |

### 1.7 字段增删 / 换位

删除胶囊、槽位间拖拽换位、更换 Y/Series/聚合；Save 刷新。

---

## 2. STYLE

![lookFeelBar.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=lookFeelBar.PNG)

### 2.1 General

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title / Subtitle | 文本 + 刷新 | 默认可为表/数据集名 |
| Width / Height (px) | 数字步进 | 图幅 |
| Opacity | 滑杆 | 柱透明度 |
| Line Width | 滑杆 | 柱描边线宽 |
| Line Color | 色块 | 柱描边色 |
| Color Palette | 下拉 + 预览 | Light / Dark / Alternate 等 |
| 系列取色 | picker | 覆盖色板 |
| Legend | 显隐/方位/自定义标题 | 同 common |
| Margins | Top/Right/Bottom/Left | 四边距 |

### 2.2 Axis Label / Range

| 控件 | 说明 |
| --- | --- |
| X/Y Label | 改显示名；刷新恢复默认（含聚合前缀） |
| Y Range | Automatic 或 Manual(min/max) |

---

## 3. 导出

![chartExport.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=chartExport.PNG)

悬停图右上角：**PDF** / **PNG**。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Series | Group By / Split Categories By | Series |
| 并排/堆叠 | （并排分组） | Grouped / Stacked |
| 方向 | — | Orientation |
| Aggregate | Aggregate Method | （或上游 transform） |
