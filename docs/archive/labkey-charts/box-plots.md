# Box Plots 功能点（细化版）

> 来源：`docs/reference/labkey/boxplot.md` + LabKey 官方截图  
> 范围：仅细化已勾选功能点  
> 状态：已细化

**图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### 1. 数据 / 属性设置（Chart Type）
- [x] Y Axis
- [x] X Axis Categories
- [x] Color 分组
- [x] Shape 分组
- [x] 字段增删与互换

### 2. 布局 / 外观设置（Chart Layout）
- [x] Title / Subtitle / Width / Height
- [x] Show Points / Jitter Points
- [x] 点/线外观（Opacity / Point Size / Line Width / Line Color / Fill Color / Color Palette）
- [x] Margins
- [x] X-Axis Label
- [x] Y-Axis Label / Scale Type / Range

### 3. 其他设置
- [x] Hover 信息
- [x] 箱线图渲染规则
- [x] 导出 PDF / PNG

---

## 1. 数据 / 属性设置（Chart Type）

入口：**Chart Type** → **Create a plot**。

### 1.1 对话框结构

![createBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=createBox.PNG)

| 区域 | 内容 |
| --- | --- |
| 左栏 | Bar / **Box** / Line / Pie / Scatter / Time |
| 中栏绑定区 | `X Axis`、`Y Axis *`、`Color`、`Shape` |
| 右栏 | Columns 列表 |
| 底部 | Cancel / Apply；标注 `* Required fields` |

### 1.2 Y Axis *（必选）

| 项 | 说明 |
| --- | --- |
| 必填 | 是 |
| 语义 | 测量值列；仅设 Y 时可生成**单箱**图 |
| 源例 | 拖入 `CD4` |

### 1.3 X Axis Categories（UI：X Axis）

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按分类列取值沿 X 生成多个 box（示例：按 Cohort） |
| 效果 | 每个分类一个箱体 |

### 1.4 Color 分组

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按列值着色 |
| 适用 | 显示全部点或离群点时更有意义 |
| 效果 | 图例显示颜色映射；悬停点可见详情 |

### 1.5 Shape 分组

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 语义 | 按列值改变点形状 |
| 源述 | 约 **5** 种形状可选（由系统按取值映射） |

### 1.6 字段增删与互换

| 能力 | 说明 |
| --- | --- |
| 删除 | 悬停胶囊点 X |
| 互换 | 在 X / Y / Color / Shape 间拖拽换位 |
| 新增分组 | 可追加 Color、Shape；需配合 Layout 的 Show Points / Jitter 才能充分看出差异 |
| 应用 | Apply 后刷新 |

---

## 2. 布局 / 外观设置（Chart Layout）

入口：**Chart Layout** → **Customize look and feel**。左侧 Tab：`General` / `X-Axis` / `Y-Axis` /（Developer 未纳入）。

### 2.1 General

![lookFeelBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=lookFeelBox.PNG)

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Title | 文本 + 刷新图标 | 默认数据集名（如 Lab Results）；刷新恢复默认 |
| Subtitle | 文本 | 副标题 |
| Width / Height (px) | 数字步进 | 图幅尺寸 |
| Show Points | 下拉 | 源文选项语义：**全部点 / 仅离群点 / 不显示**；截图示例为 `All` |
| Jitter Points | 复选框 | 勾选后水平抖动，避免点重叠（示例已勾选） |
| Opacity | 滑杆 | 透明度 |
| Point Size | 滑杆 | 点大小 |
| Line Width | 滑杆 | 线宽（箱线轮廓） |
| Line Color | 色块下拉 | 线颜色 |
| Fill Color | 色块下拉 | 箱体填充色（需向下滚动可见） |
| Color Palette | 下拉 + 色板预览 | Light (default) 等 |
| Margins (px) | Top / Right / Bottom / Left | 四边距 |

源文配合建议（看清 Color/Shape）：
1. Show Points = **All**
2. 勾选 **Jitter Points**
3. Apply

效果示意：

![boxPlotMore.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=boxPlotMore.PNG)

要点：点被抖动散开并按颜色/形状区分；**箱体外轮廓统计结构不变**——增强信息且不破坏整体分布概览。右上角有图例。

### 2.2 X-Axis

| 控件 | 说明 |
| --- | --- |
| Label | 改 X 轴显示名；不改数据列 |
| 刷新图标 | 恢复为基于列名的默认标签 |

### 2.3 Y-Axis

| 控件 | 选项/行为 |
| --- | --- |
| Label | 显示名；可刷新恢复 |
| Scale Type | **Linear** / **Log** |
| Range | **Automatic** 或 **Manual(min/max)** |

---

## 3. 其他设置

### 3.1 Hover 信息

| 对象 | 行为 |
| --- | --- |
| 箱体 | 悬停弹出统计信息（与渲染规则对应） |
| 数据点 | 悬停显示该点明细（配合 All points / outliers） |

### 3.2 箱线图渲染规则（只读统计语义）

源文定义（悬停箱体可见）：

| 标记 | 含义 |
| --- | --- |
| Min / Max | 仍落在 **1.5 × IQR** 内的最高/最低数据点 |
| Q1 | 下四分位 |
| Q2 | 中位数 |
| Q3 | 上四分位 |
| Outliers | 范围外的值，默认以点绘制；是否/如何显示由 Show Points 等控制 |

### 3.3 导出 PDF / PNG

悬停图表右上角出现导出按钮：

| 选项 | 说明 |
| --- | --- |
| PDF | 导出 PDF |
| PNG | 导出 PNG |

（同源导出条另有 Script，未纳入本次范围。）

---

## 源命名对照

| 官方文档用语 | UI 可见标签 |
| --- | --- |
| X Axis Categories | X Axis |
| Color / Shape | Color / Shape |
| Chart Layout | Customize look and feel |
