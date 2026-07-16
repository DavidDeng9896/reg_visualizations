# 统一图表 · 共性配置（CONFIGURE / STYLE）

> **产品依据（定稿）**  
> 决议：[conflicts.md](./conflicts.md)  
> 溯源：[`../charts/`](../charts/) · [`../benchling-charts/`](../benchling-charts/)

---

## 已确认范围

### CONFIGURE
- [x] View Type 切换（全部已纳入图种）
- [x] X / Y 列映射 + 类型图标（Aa / #）
- [x] 轴 settings（Custom label、范围、线性/对数等按图种）
- [x] X/Y 交换
- [x] 分组：Line/Bar 用 **Series**；Scatter/Box 用 **Color** + **Shape** 列（决议 2B）
- [x] 统计型 Error bars（决议 1A；适用范围见各图种）
- [x] Color palette
- [x] Save / Cancel → 写入表+图工作区配置（决议 10C）

### STYLE
- [x] Title / Subtitle / Width / Height / Margins（决议 9A）
- [x] 按系列/分组取色（color picker）
- [x] Point Shape / Opacity（适用图种）
- [x] Legend：显隐 / Left·Right·Top·Bottom / Custom label
- [x] 导出 PDF / PNG
- [x] 大数据抽样提示

### 工作区
- [x] 图表相对表位置：上/下/左/右（`chartPosition`，决议 9D-1；不单列 SPLIT）
- [x] Hover Tooltip
- [x] 从当前表创建图表；Edit 打开侧栏

### 排除
- Custom code / Plotly
- 独立 Regression 图种（拟合挂 Line/Scatter）
- 列映射误差棒 / 水平误差列
- Notebook 嵌入锁定

---

## 1. 配置面板结构

右侧侧栏：

| 结构 | 说明 |
| --- | --- |
| **View type** | Bar / Box / Line / Pie / Scatter / Heatmap |
| Tab **CONFIGURE** | 数据映射、聚合、误差棒、色板、拟合（Line/Scatter） |
| Tab **STYLE** | 标题尺寸、系列色、点样式、图例 |
| 底部 | Cancel / Save（保存到表+图工作区配置，见需求文档） |

---

## 2. CONFIGURE 细则

### 2.1 View Type 切换（11A）

切换后尽量保留可对齐的列映射；无法对齐的槽位清空。Heatmap 与其他类型之间同样尝试复用 X/Y。

### 2.2 轴与交换

| 项 | 说明 |
| --- | --- |
| X / Y | 下拉绑表列；Aa=分类，#=数值 |
| settings | Custom label；范围 min/max；Scale 线性/对数（图种开放时） |
| 交换 | 一键交换 X/Y 映射及轴级设置 |

### 2.3 分组命名（2B）

| 图种 | 槽位 |
| --- | --- |
| Line / Bar | **Series**（分组着色；语义同 LabKey Group By / Color） |
| Scatter / Box | **Color** 列 + **Shape** 列（按列值映射） |
| Pie | Categories（分类）+ Measure（度量） |
| Heatmap | 行列坐标 + 色阶数值列 |

### 2.4 Error bars（1A）

| 项 | 说明 |
| --- | --- |
| 类型 | **仅统计型**：None / Standard Deviation / Standard Error of the Mean |
| 条件 | 度量聚合为 **Mean**（或等价均值）时可选；其他聚合禁用 |
| 方向 | 沿度量轴（竖直柱/散点为竖直棒） |
| 范围 | **Bar、Scatter、Box**；**Line 不提供** |
| 不做 | 误差列映射、水平误差列 |

### 2.5 Color palette

预设色板（如科学默认色板）；可被 STYLE 逐系列取色覆盖。

### 2.6 Save（10C）

Save 将当前图配置写入**表+图工作区**（与 `table-chart-integration` 中图表实例配置一致）；Cancel 放弃未保存修改。

---

## 3. STYLE 细则

| 项 | 说明 |
| --- | --- |
| Title / Subtitle | 可选 |
| Width / Height / Margins | 图区域尺寸与边距 |
| Series/Color 取色 | 色块 + picker |
| Point Shape / Opacity | 有点几何的图种 |
| Legend | Show/Hide；Position；Custom legend label |
| 导出 | **PDF**、**PNG** |
| 抽样提示 | 大数据随机抽样作图时展示提示 + 完整数据下载入口 |

---

## 4. 拟合与打标（Line / Scatter 共用）

> 非独立图种；入口在 CONFIGURE 的 **Fit / Trend** 区。

| 项 | 说明 |
| --- | --- |
| 模型 | **Point-to-Point**（连接，非回归）、**Linear**、**Quadratic**、**4PL** |
| 套索打标 | Flag / Clear；需 comment；打标点显示为 × |
| Exclude flagged | 勾选后打标点不参与拟合，仍显示在图上 |
| MODEL VARIABLES | 参数表（Linear：slope/intercept；4PL：Min/Max/Hill/Inflection 等） |
| MODEL OUTPUT | 预测、残差等输出表 |
| 作用范围 | 有 Color/Series 时按组分别拟合 |

细节见 [line-charts.md](./line-charts.md)、[scatter-plots.md](./scatter-plots.md)。

---

## 源命名对照

| 统一用语 | LabKey | Benchling |
| --- | --- | --- |
| CONFIGURE | Chart Type | CONFIGURE |
| STYLE | Chart Layout | STYLE |
| Series | Group By / Series | Series |
| Color / Shape | Color / Shape | （Series + Point Shape） |
| Save | Apply / Save | Save |
| chartPosition | — | SPLIT WORKSPACE（本产品不单列） |
