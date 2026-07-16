# 统一图表 · Box Plots

> 产品依据（定稿）· [conflicts.md](./conflicts.md) · [common.md](./common.md)

---

## 已确认范围

- [x] X 分类 / Y 数值 / **Color** + **Shape** 列（2B）
- [x] Show Points 模式；箱线统计规则 UI
- [x] 统计误差棒（1A，适用时）
- [x] **无 Jitter**（4B）
- [x] STYLE：系列/分组色、点形/透明度、Legend、导出

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| X | 分类 → 多箱 |
| Y | 分布度量（必填） |
| Color | 按列值着色 |
| Shape | 按列值变形（点显示时） |
| Error bars | 统计型；Mean 场景下 SD/SEM（与箱须统计区分：箱须来自四分位规则） |

### Show Points

| 模式 | 说明 |
| --- | --- |
| 隐藏点 | 箱+须+规则离群 |
| 全部点 | 叠加原始点 |
| 仅离群 | 仅离群点 |

### 统计规则（建议默认）

箱=Q1–Q3；中位=Median；须=1.5×IQR 内最远端（可配置）；外为离群。

---

## 2. STYLE

Color 取色、Point Shape/Opacity、Legend、Title/尺寸、导出。

**不做：** Jitter。

---

## 源命名对照

| 统一 | LabKey | Benchling |
| --- | --- | --- |
| Color / Shape | Color / Shape | Series + Point Shape |
| Show Points | Show Points | Show Points |
| Jitter | Jitter Points | （排除） |
