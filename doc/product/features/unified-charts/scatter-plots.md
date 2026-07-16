# 统一图表 · Scatter Plots

> 产品依据（定稿）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> **含拟合 / 套索打标 / MODEL TABLES**；**无**密度 Layout（12B，改用 [heatmaps.md](./heatmaps.md)）

---

## 已确认范围

- [x] X / Y；**Color** + **Shape**；**Size** 第三度量
- [x] 双 Y；**分面** Number of Charts
- [x] Jitter；统计误差棒（1A）
- [x] Legend + 系列/分组取色（7D-1）
- [x] 拟合同 Line：Point-to-Point / Linear / Quadratic / 4PL + 打标 + MODEL TABLES
- [x] **不做**密度分箱 / Heat 密度色板（引导 Heatmap）
- [x] **不做**水平列映射误差棒

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| X / Y | 数值或分类 X；数值 Y；可第二 Y + 左右轴 |
| Color | 列值着色 |
| Shape | 列值变形 |
| Size | 数值列 → 点半径 |
| Error bars | Mean 聚合场景：SD / SEM（竖直） |
| Fit | 同 [line-charts.md](./line-charts.md) §3 |
| 分面 | Number of Charts / 按度量分面（LabKey 能力保留） |

过密点：提供 Jitter；密度需求引导创建 **Heatmap**。

---

## 2. STYLE

Point Shape/Opacity、分组取色、Legend、网格线（默认开）、Title/尺寸、导出、Jitter 开关。

---

## 3. 拟合 / 打标 / MODEL TABLES

与 Line 相同能力模型（见 common §4、line-charts §3）。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Color / Shape | Color / Shape | Series |
| Size | — | Size |
| 密度 | Group by Density | （改用 Heatmap） |
| Fit | Trendline（Line 侧） | Regression |
