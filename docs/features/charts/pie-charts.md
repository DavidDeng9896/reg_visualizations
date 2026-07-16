# 统一图表 · Pie Charts

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> LabKey 溯源：[`../../archive/labkey-charts/pie-charts.md`](../../archive/labkey-charts/pie-charts.md)  
> **决议 8B**：环形内径 + 百分比 + 非 Count；**无 Gradient**（保留 Outer Radius 作为图面占比，非渐变）

**LabKey 图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### CONFIGURE
- [x] Categories *
- [x] Measure + Aggregate（非 Count 扩展）
- [x] Categories 切换；View Type 切换（11A）

### STYLE
- [x] Title / Subtitle / Width / Height
- [x] Color Palette；扇区取色；Legend
- [x] Inner Radius % / Outer Radius %
- [x] Show Percentages / Hide % when less than / % Text Color
- [x] 导出 PDF/PNG

### 排除
- Gradient % / Gradient Color（8B）

---

## 1. CONFIGURE

![createPie.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=createPie.png)

| 区域 | 内容 |
| --- | --- |
| 绑定区 | `Categories *`、可选 `Measure` |
| 底部 | Cancel / Save |

### 1.1 Categories *

| 项 | 说明 |
| --- | --- |
| 必填 | 是 |
| 默认扇区 | 按唯一值 **Count** |
| Blank | 空值可作为独立扇区（`[Blank]`） |
| 源例 | `Country` |

### 1.2 Measure + Aggregate（非 Count）

| 项 | 说明 |
| --- | --- |
| 可选 | 数值列 + Count/Sum/Mean/Min/Max/Median |
| 扇区角度 | 与聚合度量成正比 |
| 负值 | 默认剔除并提示 |
| 注意 | LabKey 源仅 Count；本项为已确认产品扩展 |

### 1.3 切换

更换 Categories/Measure；View Type 切换尽量复用（when practical）。

---

## 2. STYLE

![lookFeelPie.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=lookFeelPie.PNG)

Pie 以 General 为主（无 X/Y 轴 Tab）。

### 2.1 标题与尺寸

| 控件 | 行为 |
| --- | --- |
| Title | 默认表/数据集名；可刷新 |
| Subtitle | 默认可为 Categories 列名；**只改显示** |
| Width / Height | 图幅 px |

### 2.2 Color Palette / Legend

| 控件 | 说明 |
| --- | --- |
| Color Palette | Light / Dark / Alternate + 预览 |
| 扇区取色 | picker 覆盖 |
| Legend | 显隐/方位/自定义标题 |

### 2.3 Radii

| 控件 | 行为 |
| --- | --- |
| Inner Radius % | 增大 → **Donut** |
| Outer Radius % | 外径/图面占比 |

![pieChart2.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=pieChart2.PNG)

可见：中空环、百分比、外侧类别名+引导线、Blank 扇区。

### 2.4 百分比标注

| 控件 | 行为 |
| --- | --- |
| Show Percentages | 复选；扇区内百分比 |
| Hide % when less than | 数字，默认 **5** |
| % Text Color | 色块（源例白色） |

### 2.5 Gradient

**不做**（8B）。

---

## 3. 导出

悬停右上角：**PDF** / **PNG**。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Categories | Categories * | X / 分类 |
| Measure | （扩展） | Y + 聚合 |
| Inner/Outer Radius | Inner / Outer Radius % | 环形半径 |
| Gradient | Gradient % / Color | （排除） |
