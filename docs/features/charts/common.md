# 统一图表 · 共性配置（CONFIGURE / STYLE）

> **产品依据（定稿 · 细则补强）**  
> 决议：[conflicts.md](./conflicts.md)  
> 溯源细节：[`../../archive/labkey-charts/`](../../archive/labkey-charts/)（LabKey 控件级）· [`../../archive/benchling-charts/`](../../archive/benchling-charts/)（Benchling 侧栏）

LabKey 源截图仍可对照各图种专章中的图片链接（entityId 与文件名与 `archive/labkey-charts/` 一致）。

---

## 已确认范围

### CONFIGURE
- [x] View Type 切换（全部已纳入图种，11A）
- [x] X / Y 列映射 + 类型图标（Aa / #）+ 字段胶囊增删/换位
- [x] 轴 settings（Label/Custom label、Range、Scale；按图种）
- [x] X/Y 交换
- [x] 分组：Line/Bar = **Series**；Scatter/Box = **Color** + **Shape**（2B）
- [x] 统计型 Error bars（1A；图种范围见下）
- [x] Color palette（含 Light/Dark/Alternate 等预设 + 预览）
- [x] Save / Cancel → 表+图工作区配置（10C）

### STYLE
- [x] Title / Subtitle（+ 刷新恢复默认）/ Width / Height / Margins 四边
- [x] 按系列/分组取色（色块 + picker，覆盖色板）
- [x] Point Shape / Opacity（及图种专属点/线控件，见各专章）
- [x] Legend：显隐 / Left·Right·Top·Bottom / Custom label
- [x] 导出 PDF / PNG（悬停图右上角）
- [x] 大数据抽样提示

### 工作区
- [x] `chartPosition`：上/下/左/右（9D-1）
- [x] Hover Tooltip
- [x] 从表创建图表；Edit 打开侧栏

### 排除
- Custom code / Plotly；独立 Regression 图种
- 列映射误差棒 / 水平误差列
- Notebook 嵌入；Developer JS

---

## 1. 配置面板结构

| 结构 | 说明 |
| --- | --- |
| **View type** | Bar / Box / Line / Pie / Scatter / Heatmap |
| Tab **CONFIGURE** | 映射、聚合、误差棒、色板、拟合（Line/Scatter） |
| Tab **STYLE** | 可含子区：General / X-Axis / Y-Axis（及 Left/Right） |
| 底部 | Cancel / Save |

字段交互（对齐 LabKey）：

| 能力 | 说明 |
| --- | --- |
| 绑定 | 从当前表列选择/拖入槽位 |
| 删除 | 悬停胶囊点 X |
| 换位 | 槽位间拖拽互换（X / Y / Series 或 Color/Shape） |
| 必填标记 | 槽位 `*`；底部可提示 Required fields |

---

## 2. CONFIGURE 细则

### 2.1 View Type 切换（11A）

切换后尽量保留可对齐映射；无法对齐则清空。适用性 “when practical”。

### 2.2 轴

| 项 | 说明 |
| --- | --- |
| 类型图标 | Aa=分类/文本；#=数值 |
| Label / Custom label | 只改显示名，不改数据列；刷新图标恢复「基于字段/聚合」的默认标签 |
| Scale | Linear / Log（图种开放时；对数要求正值） |
| Range | **Automatic**（Min/Max 灰显）或 **Manual(min/max)**；源文另有 Across charts / Within chart 语义，产品以 Automatic/Manual 为主并允许后续扩展 |
| 交换 | 一键交换 X/Y 映射及轴级设置 |

### 2.3 分组（2B）

| 图种 | 槽位 | 说明 |
| --- | --- | --- |
| Bar / Line | **Series** | 等同 LabKey Group By / Series；多系列着色 |
| Scatter / Box | **Color**、**Shape** | 按列值映射颜色与形状（Shape 约 5 种系统映射） |
| Pie | Categories + Measure | 见 pie 专章 |
| Heatmap | 行列坐标 + 色值列 | 见 heatmap 专章 |

### 2.4 Error bars（1A）

| 项 | 说明 |
| --- | --- |
| 选项 | None / **Standard Deviation** / **Standard Error of the Mean** |
| 条件 | 度量聚合为 **Mean** 时可用；其他聚合禁用或不展示 |
| 图种 | **Bar、Scatter、Box**；**Line 不提供** |
| 不做 | 误差列映射、水平误差列 |

### 2.5 Color palette

| 项 | 说明 |
| --- | --- |
| 预设 | 至少 **Light (default) / Dark / Alternate**（LabKey）；可增科学色板 |
| 预览 | 下拉下方色板小方块 |
| 覆盖 | STYLE 逐系列/分组 color picker 可覆盖默认分配 |

### 2.6 Save（10C）

写入表+图工作区图表实例配置；Cancel 丢弃未保存修改。

---

## 3. STYLE 共性控件

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title | 文本 + 刷新 | 默认可为数据集/表名；刷新恢复默认 |
| Subtitle | 文本 | 可选 |
| Width / Height (px) | 数字步进 | 图幅像素 |
| Margins (px) | Top / Right / Bottom / Left | 缓解轴标签重叠（例：长日期 bottom=85） |
| Opacity | 滑杆 | 点/柱透明度（图种适用） |
| Legend | 开关 + Position + Custom label | Left / Right / Top / Bottom |
| 系列取色 | 色块 + picker | 覆盖色板 |

### 导出

| 项 | 说明 |
| --- | --- |
| 触发 | 鼠标悬停图表右上角出现导出按钮 |
| PDF / PNG | 导出对应格式 |
| 不做 | Script 导出（LabKey 有、未纳入） |

### 抽样提示

大数据随机抽样作图时展示提示（文案形态对齐 Benchling）+ 完整数据下载入口。

---

## 4. 拟合与打标（Line / Scatter）

入口：CONFIGURE · **Fit / Trend**。

| 项 | 说明 |
| --- | --- |
| 模型 | **Point-to-Point**、**Linear**、**Quadratic**、**4PL**（6B；不含 3PL/5PL/Polynomial 泛型） |
| 4PL 附加 | 可选渐近线/约束 min·max（对齐 LabKey 非线性附加参数心智） |
| 套索打标 | Flag / Clear；comment 必填；点显示 × |
| Exclude flagged | 不参与拟合，仍显示 ×（6F-1） |
| MODEL VARIABLES | Linear：slope、intercept；4PL：Min、Max、Hill Slope、Inflection（+CI 若有） |
| MODEL OUTPUT | 预测、残差等 |
| 作用范围 | 有 Series/Color 时**每组分别**拟合 |
| 悬停拟合线 | 显示统计量与拟合参数（LabKey 趋势线交互） |

细节：[line-charts.md](./line-charts.md)、[scatter-plots.md](./scatter-plots.md)。

---

## 源命名对照

| 统一用语 | LabKey | Benchling |
| --- | --- | --- |
| CONFIGURE | Chart Type / Create a plot | CONFIGURE |
| STYLE | Chart Layout / Customize look and feel | STYLE |
| Series | Group By / Series | Series |
| Color / Shape | Color / Shape | Series + Point Shape |
| Label | Axis Label | Custom label |
| Save | Apply / Save | Save |
| chartPosition | — | SPLIT WORKSPACE（不单列） |
