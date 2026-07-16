# 统一图表 · Bar Charts

> 产品依据（定稿）· 决议见 [conflicts.md](./conflicts.md) · 共性见 [common.md](./common.md)

---

## 已确认范围

- [x] View Type = Bar；可切换类型（11A）
- [x] X（分类）/ Y（度量）/ **Series**（2B 别名）
- [x] 聚合 Count/Sum/Mean/Min/Max/Median
- [x] 柱方向竖直/水平；并排/堆叠（3B）
- [x] 统计误差棒（1A，Mean 时 SD/SEM）
- [x] Color palette、Custom label、轴范围
- [x] STYLE：系列色、Legend、Title/尺寸/导出

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| X | 分类列（水平柱时分类可在 Y 侧，见方向） |
| Y | 度量列；未设时默认 Count |
| Series | 多系列着色；与并排/堆叠联动 |
| 聚合 | Count / Sum / Mean / Min / Max / Median；标签如 `Mean of …` |
| 方向 | **竖直**（默认）/ **水平** |
| 分组模式 | Series≠None 时：**并排** / **堆叠** |
| Error bars | 仅聚合=Mean：None / SD / SEM |
| 轴范围 | 度量轴 min/max（settings） |

---

## 2. STYLE

系列取色、Legend、Title/Subtitle/尺寸/边距、导出 PDF/PNG。柱图可不暴露 Point 区。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Series | Group By | Series |
| 并排/堆叠 | （并排分组） | Grouped / Stacked |
| 方向 | — | Orientation |
