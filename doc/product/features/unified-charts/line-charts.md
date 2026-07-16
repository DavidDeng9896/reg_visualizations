# 统一图表 · Line Charts

> 产品依据（定稿）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> **含拟合 / 套索打标 / MODEL TABLES**（与 Scatter 共用能力模型）

---

## 已确认范围

### 标准 Line
- [x] X / Y / **Series**；双 Y（Y Axis Side）
- [x] 点形 / 透明度 / **对数轴**（5B）
- [x] **无** Hide Points、**无**线宽、**无**误差棒（1A 未含 Line）
- [x] Legend、系列色、Title/尺寸、导出

### 拟合（6B + 6F-1 + 6G-1）
- [x] Point-to-Point / Linear / Quadratic / 4PL
- [x] 套索打标 + Exclude flagged from fit
- [x] MODEL VARIABLES + MODEL OUTPUT

### 排除
- Custom code / Plotly 多 Y（≥3）/ 峰值标注流程

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| X / Y | 有序或数值 X；数值 Y；可追加第二 Y 并设左右轴 |
| Series | 多折线 |
| Scale | 轴 settings：线性 / 对数（正值） |
| Fit model | Point-to-Point / Linear / Quadratic / 4PL |
| Exclude flagged | 拟合时排除打标点 |

Point-to-Point：按 X 排序连线，不产出回归参数表（VARIABLES 可空或隐藏）。

---

## 2. STYLE

Series 色、Point Shape/Opacity、Legend、Title/尺寸/边距、导出。  
**不提供** Hide Data Points、Line Width。

---

## 3. 套索打标与 MODEL TABLES

| 能力 | 说明 |
| --- | --- |
| Flag / Clear | 套索选点；comment 必填；点显示 × |
| Exclude flagged | 仍显示 ×，不参与 Linear/Quadratic/4PL |
| MODEL VARIABLES | Linear：slope、intercept；4PL：Min、Max、Hill Slope、Inflection（及 CI 若有） |
| MODEL OUTPUT | 拟合预测、残差等行表 |
| 分组 | 有 Series 时每组一条拟合与一套参数 |

底栏或侧栏 Tab：图 / MODEL VARIABLES / MODEL OUTPUT；可链回源表数据。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Fit model | Trendline Type | Regression model |
| Point-to-Point | Point-to-Point | — |
| 4PL | Nonlinear 4PL | 4-parameter logistic |
| Exclude flagged | — | Exclude flagged values |
