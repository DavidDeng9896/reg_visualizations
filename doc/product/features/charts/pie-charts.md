# Pie Charts 功能点（细化版）

> 来源：`doc/reference/labkey/piechart.md` + LabKey 官方截图  
> 范围：仅细化已勾选功能点  
> 状态：已细化

**图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### 1. 数据 / 属性设置（Chart Type）
- [x] Categories
- [x] Categories 字段切换
- [x] 图表类型切换
- [x] （扩展确认）度量值字段非 Count 的需求说明

### 2. 布局 / 外观设置（Chart Layout）
- [x] Title / Subtitle / Width / Height
- [x] Color Palette
- [x] Radii（Inner / Outer）
- [x] 百分比标注（Show / Hide threshold / Text Color）
- [x] Gradient % + Gradient Color

### 3. 其他设置
- [x] 导出 PDF / PNG

---

## 1. 数据 / 属性设置（Chart Type）

入口：**Chart Type** → **Create a plot**。

### 1.1 对话框结构

![createPie.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=createPie.png)

| 区域 | 内容 |
| --- | --- |
| 左栏 | Bar / Box / Line / **Pie** / Scatter / Time |
| 中栏 | `Categories *` 拖放区 |
| 右栏 | Columns |
| 底部 | Cancel / Apply |

### 1.2 Categories *

| 项 | 说明 |
| --- | --- |
| 必填 | 是 |
| 交互 | 从 Columns 拖入（示例：`Country`）；出现 “1 column selected” 反馈 |
| 扇区大小 | **按该列唯一值的行数 Count** 决定楔形相对大小 |
| Blank | 空值可作为独立扇区出现（效果图中有 `[Blank]`） |

### 1.3 Categories 字段切换

| 能力 | 说明 |
| --- | --- |
| 更换分类列 | 在 Chart Type 中改 Categories 绑定 |
| Apply | 刷新扇区划分与比例 |

### 1.4 图表类型切换

| 能力 | 说明 |
| --- | --- |
| 左栏切换 | 在字段仍适用时，可切到其他类型并尽量复用所选列 |
| 适用性 | “when practical”——并非所有类型都能无损复用 Categories |

### 1.5 扩展确认：非 Count 度量

| 项 | 说明 |
| --- | --- |
| 源行为 | **仅 Count（按 Categories 唯一值计数）**；创建对话框无 Y/度量绑定 |
| 已确认扩展 | 产品侧可补充「度量值字段（非 Count）」能力（如按某数值列 Sum/Mean 决定扇区大小） |
| 注意 | 该扩展**超出**当前 LabKey 源文档能力，细化实现时需单独设计，不可误标为源已支持 |

---

## 2. 布局 / 外观设置（Chart Layout）

入口：**Chart Layout** → **Customize look and feel**（Pie 以 General 双栏为主，无 X/Y 轴 Tab）。

![lookFeelPie.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=lookFeelPie.PNG)

### 2.1 标题与尺寸

| 控件 | 默认/行为 |
| --- | --- |
| Title | 默认数据集名（如 Lab Results）；可刷新恢复 |
| Subtitle | 默认 Categories 列名（如 Country）；**只改显示，不改分类字段** |
| Width / Height (px) | 图幅像素 |

### 2.2 Color Palette

| 控件 | 选项 |
| --- | --- |
| Color Palette | **Light / Dark / Alternate** |
| 预览 | 下拉下方色板小方块（截图 Alternate 可见多色条） |

### 2.3 Radii（半径 → 饼/环）

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| Inner Radius % | 滑杆 | 增大则中空，形成**环形图（Donut）** |
| Outer Radius % | 滑杆 | 控制整体外径/图面占比 |

效果示意（环形 + 百分比）：

![pieChart2.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6ebd3-ed56-1034-b734-fe851e088836&name=pieChart2.PNG)

可见：中空环、扇区百分比、外侧类别名 + 引导线、含 Blank 扇区、标题/副标题。

### 2.4 百分比标注

| 控件 | 截图/源行为 |
| --- | --- |
| Show Percentages | 复选框；勾选后扇区内显示百分比 |
| Hide % when less than | 数字（默认 **5**）；窄扇区低于阈值则隐藏百分比文字 |
| % Text Color | 色块（截图为白色） |

### 2.5 Gradient

| 控件 | 行为 |
| --- | --- |
| Gradient % | 滑杆，控制渐变强度/范围 |
| Gradient Color | 色块（截图为黄/金色），营造扇区阴影立体感 |

底部：**Cancel** / **Apply**。

---

## 3. 其他设置 · 导出

悬停图表右上角：

| 选项 | 说明 |
| --- | --- |
| PDF | 导出 PDF |
| PNG | 导出 PNG |

编辑态工具栏另可见 View Data / Chart Type / Chart Layout / Save（Save 未纳入本次细化）。

---

## 源命名对照

| 官方文档用语 | UI 可见标签 |
| --- | --- |
| Categories | Categories * |
| Radii / hollow center | Inner Radius % / Outer Radius % |
| Percentages | Show Percentages / Hide % when less than / % Text Color |
