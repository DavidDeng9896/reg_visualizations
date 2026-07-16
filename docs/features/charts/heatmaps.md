# 统一图表 · Heatmaps

> 产品依据（定稿 · 细则补强）· [conflicts.md](./conflicts.md) · [common.md](./common.md)  
> Benchling 溯源：[`../../archive/benchling-charts/heatmaps.md`](../../archive/benchling-charts/heatmaps.md)  
> 替代原 LabKey Scatter **密度 Layout**（决议 12B）

**GIF 参考：** `https://help.benchling.com/hc/article_attachments/46023901987981`

---

## 已确认范围

### CONFIGURE
- [x] View Type = Heatmap；可切换（11A）
- [x] X / Y 行列坐标
- [x] 色阶数值列（经 CONFIGURE 绑定；不强制「颜色度量」专名）
- [x] Color palette（连续色阶预设）

### STYLE
- [x] Title / Subtitle / Width / Height / Margins
- [x] 连续色阶图例 + Position
- [x] 色阶类型切换（蓝白等）
- [x] 单元格数值标注开关
- [x] 行列排序 / 聚类
- [x] 导出 PDF/PNG

### 其他
- [x] Hover（行列坐标 + 色值）
- [x] 抽样提示（common）

### 排除
- Flowchart 节点 I/O；Notebook 嵌入

---

## 1. CONFIGURE

| 槽位 | 说明 | 源例 |
| --- | --- | --- |
| X | 列坐标 | Coordinates Column（1…N） |
| Y | 行坐标 | Coordinates Row（0…N） |
| 色值列 | 连续数值 → 填充色 | Percent Inhibition |
| Color palette | 连续色阶族 | 蓝白等 |

每个 (X,Y) 一格；缺失用空值色或不绘。

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| 色阶图例 | 右侧竖条连续色阶（默认）；Position：Left/Right/Top/Bottom |
| 色阶类型 | 可切换预设连续色板 |
| 格内标注 | 开关，默认关；注意对比度 |
| 行列排序 | 按标签、行/列均值或指定度量 |
| 聚类 | 可选层次聚类重排行列 |
| Title 等 | 同 common（例：`96WP033_Heatmap`） |

---

## 3. Hover / 导出

Hover：Coordinates Column、Coordinates Row、色值精确值。  
导出：PDF / PNG。

---

## 与 Scatter 密度的关系

| LabKey Scatter 密度项 | 本产品 |
| --- | --- |
| Group by Density | **不提供** → 用 Heatmap |
| Grouped Data Shape | **不提供** |
| Density Color Palette | 由 Heatmap 连续色阶承担 |

---

## 源命名对照

| 统一 | Benchling |
| --- | --- |
| X / Y | Coordinates Column / Row |
| 色阶 | 连续色阶图例 |
| Heatmap | View type = Heatmap |
