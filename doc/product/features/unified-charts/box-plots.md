# 统一图表 · Box Plots

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> LabKey 溯源：[`../charts/box-plots.md`](../charts/box-plots.md)  
> **决议 4B：无 Jitter**

**LabKey 图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### CONFIGURE
- [x] Y Axis *；X Axis Categories
- [x] Color / Shape 列映射（2B）
- [x] 字段增删与互换；View Type 切换
- [x] 统计 Error bars（1A，适用时）

### STYLE
- [x] Title / Subtitle / Width / Height / Margins
- [x] Show Points（全部 / 仅离群 / 不显示）
- [x] Opacity / Point Size / Line Width / Line Color / Fill Color / Color Palette
- [x] 系列/分组取色；Legend；Point Shape（与 Shape 列配合）
- [x] X/Y Label；Y Scale Linear/Log；Y Range
- [x] Hover；箱线渲染规则；导出 PDF/PNG

### 排除
- [ ] Jitter Points（4B）

---

## 1. CONFIGURE

![createBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=createBox.PNG)

| 区域 | 内容 |
| --- | --- |
| 绑定区 | `X Axis`、`Y Axis *`、`Color`、`Shape` |
| 底部 | Cancel / Save；`* Required fields` |

### 1.1 Y Axis *（必选）

| 项 | 说明 |
| --- | --- |
| 必填 | 是 |
| 语义 | 测量值列；仅设 Y 时可生成**单箱** |
| 源例 | `CD4` |

### 1.2 X Axis Categories

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按分类沿 X 多箱（例：Cohort） |

### 1.3 Color / Shape

| 绑定 | 说明 |
| --- | --- |
| Color | 按列值着色；图例色映射；点悬停可见详情 |
| Shape | 按列值变形；系统约 **5** 种形状映射 |
| 建议 | 看清编码时 Show Points = All（无 Jitter） |

### 1.4 字段增删与互换

悬停清除；X/Y/Color/Shape 间换位；Save 刷新。

### 1.5 Error bars（1A）

统计型 SD/SEM；与箱须（1.5×IQR 规则）区分——误差棒仅在 Mean 聚合语义适用时提供（若 Box 无显式聚合，则按实现：对箱内均值统计误差或隐藏该槽；产品默认：**有明确 Mean 聚合上下文时才显示**）。

---

## 2. STYLE

![lookFeelBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=lookFeelBox.PNG)

### 2.1 General

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title / Subtitle | 文本 + 刷新 | 默认表/数据集名 |
| Width / Height | 数字步进 | 图幅 |
| Show Points | 下拉 | **全部点 / 仅离群点 / 不显示**（源例 `All`） |
| Jitter Points | — | **不做**（4B） |
| Opacity | 滑杆 | 透明度 |
| Point Size | 滑杆 | 点大小 |
| Line Width | 滑杆 | 箱线轮廓线宽 |
| Line Color | 色块 | 线颜色 |
| Fill Color | 色块 | 箱体填充 |
| Color Palette | 下拉 + 预览 | Light 等 |
| 分组取色 | picker | 覆盖色板 |
| Legend | 显隐/方位/标题 | 同 common |
| Margins | 四边 | px |

效果参考（LabKey 含 Jitter；本产品无抖动，点可能重叠）：

![boxPlotMore.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=boxPlotMore.PNG)

要点：Color/Shape 区分点；**箱体外轮廓统计结构不变**。

### 2.2 X-Axis / Y-Axis

| 控件 | 说明 |
| --- | --- |
| Label | 显示名；刷新恢复 |
| Y Scale Type | **Linear** / **Log** |
| Y Range | Automatic 或 Manual(min/max) |

---

## 3. 其他

### 3.1 Hover

| 对象 | 行为 |
| --- | --- |
| 箱体 | 弹出统计（对齐渲染规则） |
| 数据点 | 点明细（All / outliers 时） |

### 3.2 箱线渲染规则（只读统计语义）

| 标记 | 含义 |
| --- | --- |
| Min / Max（须端） | 仍落在 **1.5 × IQR** 内的最高/最低数据点 |
| Q1 | 下四分位 |
| Q2 | 中位数 |
| Q3 | 上四分位 |
| Outliers | 须外点；是否显示由 Show Points 控制 |

### 3.3 导出

悬停右上角：**PDF** / **PNG**。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Color / Shape | Color / Shape | Series + Point Shape |
| Show Points | Show Points | Show Points |
| Jitter | Jitter Points | （排除） |
