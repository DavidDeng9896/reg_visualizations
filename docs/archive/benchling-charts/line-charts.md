# Benchling · Line Charts（细化版）

> 来源：Benchling Analysis 正文 + View Type 截图 + Advanced Visualizations GIF  
> 共性见 [common.md](./common.md)  
> 状态：**已细化**

---

## 已确认范围

### 1. 标准 Line View（CONFIGURE）
- [x] View Type = Line chart
- [x] X-axis / Y-axis / Series
- [x] Error bars
- [x] Color palette / Custom label / 轴 settings 齿轮
- [x] 对数轴

### 2. STYLE
- [x] Series Color
- [x] Point Shape / Opacity（折线节点）
- [x] Legend

### 3. Custom code / Plotly（高级）
- [x] 多 Trace（颜色、dash：solid / dash / dot）
- [x] 多 Y 轴（y / y2 / y3，右侧 overlay、position 偏移）
- [x] Layout：Title、X 标题、plot_bgcolor、Legend title
- [x] 峰值标注（scipy.find_peaks → 点标记）
- [x] Output charts 作为流程节点输出

### 排除
- 线宽 / 线型（无代码时的标准 Line）
- 隐藏数据点只留线
- Save / Hover（由 common 覆盖）

---

## 1. 标准 Line View · 数据设置

### 1.1 View Type = Line chart

View type → **Line chart**。

### 1.2 X / Y / Series

| 槽位 | 说明 |
| --- | --- |
| X-axis | 有序分类或数值（时间、剂量、索引等） |
| Y-axis | 数值度量 |
| Series | `None` 或分类列 → 多折线 |

齿轮、Custom label、Color palette、X/Y 交换 → common。

### 1.3 Error bars

| 项 | 说明 |
| --- | --- |
| 确认 | **对 Line 开放**（与共性 Error bars 槽位相同） |
| 表现 | 节点处竖直误差棒（对数轴时按轴比例绘制） |

### 1.4 对数轴

| 项 | 说明 |
| --- | --- |
| 入口 | 轴 settings 齿轮（X 和/或 Y） |
| 选项 | 线性 / 对数 |
| 证据 | 源回归图常见 log X；**已确认标准 Line 可用** |
| 约束 | 对数轴要求正值；≤0 需提示或过滤 |

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| Series Color | 逐系列取色 |
| Point Shape / Opacity | 折线**节点标记**形状与透明度 |
| Legend | 显隐 / Left·Right·Top·Bottom / Custom label |

未纳入：标准 UI 下的线宽、线型、仅线无点（见排除）。

---

## 3. Custom code / Plotly 折线（高级可视化）

> Advanced Visualizations GIF：用 Plotly 做 Chromatogram 等，**非**标准 Line View 表单。  
> 参考原文「创建高级可视化」+ GIF：`https://help.benchling.com/hc/article_attachments/46068415404685`

### 3.1 能力清单

| 能力 | 细则 |
| --- | --- |
| **多 Trace** | 多条线；每条可设 color、`dash`∈{solid, dash, dot} |
| **多 Y 轴** | `y` / `y2` / `y3`；右侧 overlay；`position` 偏移避免重叠 |
| **Layout** | Title、X 轴标题、`plot_bgcolor`、Legend title |
| **峰值标注** | 例：`scipy.find_peaks` 结果以点标记叠加 |
| **节点输出** | Custom Code 步骤输出 chart（IOData），作为 Flowchart 下游输入 |

### 3.2 产品定位

| 项 | 说明 |
| --- | --- |
| 入口 | Flowchart → **Custom Code** 步骤（需代码环境 / Plotly） |
| 与标准 Line | 并存；标准 Line 不要求暴露多 Y / dash 表单 |
| 包依赖 | 与源环境对齐时可参考 plotly / scipy（见参考原文包表） |

---

## 源命名对照

| 文档用语 | UI |
| --- | --- |
| Line chart | View type = Line chart |
| Log axis | 轴 settings · 对数 |
| Custom code chart | Custom Code → Plotly Figure |
