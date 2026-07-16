# Benchling · Heatmaps（细化版）

> 来源：left-sidebar GIF 拆帧（热力实图强于正文）  
> 共性见 [common.md](./common.md)  
> 状态：**已细化**

**GIF 参考：** `https://help.benchling.com/hc/article_attachments/46023901987981`

---

## 已确认范围

### 1. 数据 / 属性
- [x] View Type = Heatmap
- [x] X 维：Coordinates Column（列坐标）
- [x] Y 维：Coordinates Row（行坐标）
- [x] 标准 CONFIGURE 入口（与 X/Y/Series/Color palette 同一套侧栏）

### 2. 布局 / 外观
- [x] 连续色阶图例
- [x] 单元格填充色映射强度
- [x] Legend 方位（色阶位置）
- [x] 图表标题 + Edit / More
- [x] 色阶类型切换
- [x] 单元格内数值标注开关
- [x] 行列聚类 / 排序

### 3. 其他
- [x] Hover Tooltip
- [x] 侧栏搜索按 “heatmap” 过滤视图

### 排除
- 独立勾选项「颜色度量」未勾选 → **不单独命名 Color measure 槽**；色阶数值由色阶图例/Hover 所依赖的数值列提供，经同一 CONFIGURE 侧栏绑定
- Flowchart 节点 I/O（Input / Output chart / dataset / Sampled）整组未勾选 → 不纳入
- Save；Filters；SPLIT（本文件未勾选 → 见 common）

---

## 1. 数据 / 属性设置

### 1.1 View Type = Heatmap

View type 下拉可见 **Heatmap**。

### 1.2 行列坐标

| 维 | 源例轴标题 | 说明 |
| --- | --- | --- |
| **X** | Coordinates Column | 列坐标 1…N（或分类列名） |
| **Y** | Coordinates Row | 行坐标 0…N（或分类行名） |

每个 (X, Y) 交叉对应一格。

### 1.3 CONFIGURE 同一套入口

| 项 | 说明 |
| --- | --- |
| 确认 | 热力使用与标准图相同的右侧 CONFIGURE / STYLE 侧栏模式 |
| 映射 | X / Y 绑坐标列；Series / Color palette 按需（连续色阶为主时 Series 可为 None） |
| 色值 | 单元格强度来自数值列（源例图例/Hover：**Percent Inhibition**）；实现上在 CONFIGURE 提供数值绑定，**不强制使用「颜色度量」产品专名** |

---

## 2. 布局 / 外观

### 2.1 连续色阶图例

| 项 | 说明 |
| --- | --- |
| 形态 | 右侧竖条连续色阶（与分类系列色块不同） |
| 源例 | 0→100，标题 Percent Inhibition，由浅到深 |
| **Legend 方位** | 色阶可定位；与 STYLE Legend 位置枚举对齐（Left / Right / Top / Bottom），默认 Right |

### 2.2 单元格填充

填充色 = 色阶上对应数值的颜色；空缺格用中性空值色或不绘制。

### 2.3 色阶类型切换

| 项 | 说明 |
| --- | --- |
| 能力 | 切换预设连续色阶（如蓝白、其他科学色板） |
| 入口 | CONFIGURE Color palette 的连续变体，或 STYLE 色阶选择器 |

### 2.4 单元格内数值标注

| 项 | 说明 |
| --- | --- |
| 开关 | 显示 / 隐藏格内数值文本 |
| 默认 | 关（源 GIF 以 Hover 为主）；开启后注意字号与对比度 |

### 2.5 行列聚类 / 排序

| 项 | 说明 |
| --- | --- |
| 排序 | 按坐标标签、按行/列均值或指定度量重排 |
| 聚类 | 可选层次聚类重排行列（科学热力常见）；无算法时至少提供手动/度量排序 |

### 2.6 标题与菜单

| 项 | 说明 |
| --- | --- |
| 标题 | 例：`96WP033_Heatmap` |
| Edit | 铅笔打开配置 |
| More（…） | 源 View 菜单（提升为表等；产品按表+图需求裁剪） |

---

## 3. 其他设置

### 3.1 Hover Tooltip

GIF：显示 **Coordinates Column**、**Coordinates Row**、**Percent Inhibition**（精确值）。

### 3.2 侧栏搜索

按关键字（如 `heatmap`）过滤 Analysis 侧栏中的视图列表。

---

## 源命名对照

| 文档用语 | UI / 源例 |
| --- | --- |
| Heatmap | View type = Heatmap |
| Column / Row coordinates | Coordinates Column / Coordinates Row |
| Color scale | 连续色阶图例 |
| Cell value | Hover / 格内标注数值 |
