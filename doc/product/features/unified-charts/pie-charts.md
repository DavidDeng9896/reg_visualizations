# 统一图表 · Pie Charts

> 产品依据（定稿）· [conflicts.md](./conflicts.md) · [common.md](./common.md)

---

## 已确认范围

- [x] Categories + 度量（非 Count 聚合）（8B）
- [x] 环形内径；百分比标注与阈值隐藏
- [x] **无** Gradient
- [x] Color palette、Legend、系列/扇区取色、导出

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| Categories | 扇区分类（必填） |
| Measure | 可选数值列；空则 Count |
| 聚合 | Count / Sum / Mean / Min / Max / Median |
| View Type | 可切换（11A） |

负值：默认剔除并提示。

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| 内径 | 0=实心饼，>0=甜甜圈（环形半径） |
| 百分比标注 | 开关；过小扇区可藏标注 |
| 分类标签 | 可关，依赖 Legend |
| Color / Legend | 扇区色、图例方位 |
| Title / 尺寸 / 导出 | 同 common |

**不做：** Gradient % / Gradient Color。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Categories | Categories | X / 分类 |
| Measure | （扩展非 Count） | Y + 聚合 |
| 内径 | Inner radius | 环形半径 |
| Gradient | Gradient | （排除） |
