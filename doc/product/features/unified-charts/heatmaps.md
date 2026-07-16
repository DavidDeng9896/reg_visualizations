# 统一图表 · Heatmaps

> 产品依据（定稿）· 主要溯源 Benchling · [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> Scatter 密度 Layout 已取消，密集矩阵可视化以本图种为准（12B）。

---

## 已确认范围

- [x] View Type = Heatmap
- [x] X/Y 行列坐标；CONFIGURE 同侧栏
- [x] 连续色阶图例；色阶类型；格内数值标注；行列排序/聚类
- [x] Hover；Title；导出（随 common）
- [x] **不做** Flowchart 节点 I/O；**不做**独立「颜色度量」专名（色值经 CONFIGURE 数值列绑定）

---

## 1. CONFIGURE

| 槽位 | 说明 |
| --- | --- |
| X | 列坐标（例：Coordinates Column） |
| Y | 行坐标（例：Coordinates Row） |
| 色值列 | 连续数值 → 色阶（Hover/图例标题用列名或 Custom label） |
| Color palette | 连续色阶预设（蓝白等） |

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| 色阶图例 | 默认右侧竖条；Position 可调 |
| 格内标注 | 开关，默认关 |
| 行列排序/聚类 | 按标签、均值或层次聚类重排 |
| Title / 尺寸 / 导出 | 同 common |

---

## 3. Hover

显示行坐标、列坐标、色值精确值。

---

## 源命名对照

| 统一 | Benchling 源例 |
| --- | --- |
| X / Y | Coordinates Column / Row |
| 色阶 | Percent Inhibition 连续色阶 |
| Heatmap | View type = Heatmap |
