# 统一图表 · Scatter Plots

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> LabKey 溯源：[`../../archive/labkey-charts/scatter-plots.md`](../../archive/labkey-charts/scatter-plots.md)  
> **12B / 7**：无密度 Layout → 改用 [heatmaps.md](./heatmaps.md)；保留 Size、Jitter、双 Y、分面、统计误差棒、拟合套件、Legend

**LabKey 图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### CONFIGURE
- [x] X Axis * / Y Axis *；Second Y（Y Axis Side）
- [x] Color / Shape；**Size** 第三度量
- [x] 统计 Error bars（1A）
- [x] Fit：Point-to-Point / Linear / Quadratic / 4PL + 打标 + MODEL TABLES
- [x] 字段增删；View Type 切换

### STYLE
- [x] Title / Subtitle / Width / Height / Margins
- [x] Jitter Points / Opacity / Point Size / Point Shape / Color Palette
- [x] Number of Charts（One / One Per Measure）
- [x] Legend + 分组取色（7D-1）
- [x] X/Y Label / Scale / Range；网格线
- [x] 导出 PDF/PNG

### 排除
- Group by Density / Grouped Data Shape / Density Color Palette（12B）
- 水平列映射误差棒；Custom code

---

## 1. CONFIGURE

![createScatter.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=createScatter.png)

| 区域 | 内容 |
| --- | --- |
| 绑定区 | `X Axis *`、`Y Axis *`、`Color`、`Shape`、`Size`、`Fit model` |
| 底部 | Cancel / Save；Required 提示 |

### 1.1 X / Y

| 字段 | 必填 | 说明 | 源例 |
| --- | --- | --- | --- |
| X | 是 | 数值横轴（亦可分类轴+Jitter） | `CD4` |
| Y | 是 | 数值纵轴；可多度量 | `White Blood Count` |

### 1.2 Second Y Axis

![scatterSecond.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=scatterSecond.PNG)

| 项 | 说明 |
| --- | --- |
| 添加 | 再绑 Y 度量 |
| Y Axis Side | 左右箭头指定纵轴 |
| 技巧 | 可先去掉 Color/Shape 更易看清双轴 |

### 1.3 Color / Shape / Size

![scatterMore.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=scatterMore.PNG)

| 绑定 | 说明 |
| --- | --- |
| Color | 列值着色（例：Cohort）；图例 |
| Shape | 列值变形（例：Treatment Group） |
| Size | 数值列 → 点半径；Hover/图例标明字段 |

### 1.4 Error bars（1A）

Mean 聚合上下文：None / SD / SEM（竖直）。无列映射水平误差棒。

### 1.5 Fit / 打标

与 [line-charts.md](./line-charts.md) §3 相同：四模型、Exclude flagged、MODEL VARIABLES + OUTPUT、按 Color 分组分别拟合。

### 1.6 字段与类型切换

增删/换位；切换类型尽量保留轴与 Color/Shape（when practical）。

---

## 2. STYLE

![lookFeelScatter.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebf9-ed56-1034-b734-fe851e088836&name=lookFeelScatter.PNG)

### 2.1 General

| 控件 | 行为 |
| --- | --- |
| Title / Subtitle | 文本 + 刷新 |
| Width / Height | 图幅 |
| Jitter Points | 复选；减轻重叠 |
| Opacity / Point Size / Point Shape | 点外观 |
| Color Palette | Light / Dark / Alternate + 预览 |
| 分组取色 | picker；**要 Legend**（7D-1） |
| Number of Charts | **One Chart** / **One Per Measure** |
| Margins | 四边 |
| 网格线 | 默认开启（Benchling 截图习惯） |

### 2.2 密度（已排除）

LabKey 曾有 Group by Density / Hexagon|Square / Density Color Palette。  
**本产品不提供**；过密点提示用户改用 **Heatmap**。

### 2.3 X-Axis / Y-Axis

| 控件 | 说明 |
| --- | --- |
| Label | 显示名；刷新恢复 |
| Scale Type | 各轴 **Linear** / **Log** |
| Range | 各轴 Automatic 或 Manual(min/max) |

---

## 3. 其他

### 3.1 分面与双轴

| 设置 | 行为 |
| --- | --- |
| One Per Measure | 每 Y 度量单独成图 |
| 与双轴 | 分面后**仍尊重**各度量 Y Axis Side |

### 3.2 Hover / 导出

Hover：X/Y/Color/Shape/Size/误差；导出 PDF/PNG。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Color / Shape | Color / Shape | Series |
| Size | — | Size |
| Number of Charts | One / One Per Measure | — |
| 密度 | Group by Density 等 | （改用 Heatmap） |
| Fit | Trendline（Line） | Regression |
