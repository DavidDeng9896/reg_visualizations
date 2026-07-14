# Bar Charts 功能点（细化版）

> 来源：`doc/reference/labkey/barchart.md` + LabKey 官方截图  
> 范围：仅细化已勾选功能点  
> 状态：已细化

**图片基址：** `https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=`

---

## 已确认范围

### 1. 数据 / 属性设置（Chart Type）
- [x] X Axis Categories
- [x] Y Axis 度量列
- [x] Aggregate Method
- [x] Split Categories By（UI 名：Group By）
- [x] 字段角色切换

### 2. 布局 / 外观设置（Chart Layout）
- [x] Title / Subtitle / Width / Height
- [x] Bar 外观（Opacity / Line Width / Line Color）
- [x] Fill Color Palette
- [x] Margins
- [x] Axis Label
- [x] Y-Axis Range
- [x] Error Bars

### 3. 其他设置
- [x] 导出 PDF / PNG

---

## 1. 数据 / 属性设置（Chart Type）

入口：图表编辑态右上角 **Chart Type** → 打开 **Create a plot** 对话框。

### 1.1 对话框结构（截图依据）

![createBar.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=createBar.png)

三栏结构：

| 区域 | 内容 |
| --- | --- |
| 左栏 | 图表类型：Bar / Box / Line / Pie / Scatter / Time（Bar 选中高亮） |
| 中栏 | Bar 绑定区：`X Axis *`、`Group By`、`Y Axis` |
| 右栏 | Columns 列表，可拖拽字段 |
| 底部 | Cancel / Apply |

### 1.2 X Axis Categories（UI：X Axis *）

| 项 | 说明 |
| --- | --- |
| 必填 | 是（`*`） |
| 交互 | 从 Columns 拖放到 X Axis |
| 语义 | 分类列；每个取值对应一组柱 |
| 未设 Y 时默认 | 柱高 = 该分类匹配行数（Count） |
| 源例 | 拖入 `Cohort` |

### 1.3 Y Axis 度量列

![addYtoBar.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=addYtoBar.PNG)

| 项 | 说明 |
| --- | --- |
| 必填 | 否 |
| 交互 | 拖入数值列到 Y Axis |
| 胶囊显示 | 形如 `Sum of White Blood Count` / `Mean of White Blood Count`（聚合名 + 字段名） |
| 作用 | 用聚合后的度量值作为柱高，替代默认 Count |

### 1.4 Aggregate Method（聚合方式）

出现在 Y Axis 字段胶囊内的下拉框。

**截图可见选项：**

| 选项 | 说明 |
| --- | --- |
| Count (non-blank) | 非空计数 |
| Sum | 求和（拖入数值列后常见默认） |
| Min | 最小 |
| Max | 最大 |
| Mean | 均值（示例中改为此项） |
| Median | 中位数 |

规则：
- 切换聚合后，Y 轴胶囊文案与 Y 轴标签自动更新（如改为 Mean → `Mean of …`）。
- 与 Error Bars 联动：仅当聚合为 **Mean** 时，误差棒选项可用（见 2.3）。

### 1.5 Split Categories By（UI：Group By）

![addSplit.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=addSplit.PNG)

| 项 | 说明 |
| --- | --- |
| UI 标签 | **Group By**（官方文档写作 Split Categories By） |
| 必填 | 否 |
| 交互 | 拖入第二分类列（示例：`Visit`） |
| 效果 | 生成分组柱；Split/Group 取值沿 X 展示，原 X Categories 用颜色区分；显示图例色映射 |

### 1.6 字段角色切换

| 能力 | 说明 |
| --- | --- |
| 删除绑定 | 悬停字段胶囊点 X 清除 |
| 互换用途 | 在 X / Group By / Y 选择框间拖拽换位 |
| 修改度量 | 可移除/更换 Y 列、Group By 列或聚合方式 |
| 应用 | 点 **Apply** 刷新图表 |

---

## 2. 布局 / 外观设置（Chart Layout）

入口：**Chart Layout** → **Customize look and feel**。左侧 Tab：`General` / `X-Axis` / `Y-Axis`。

### 2.1 General

![lookFeelBar.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=lookFeelBar.PNG)

| 控件 | 类型 | 源/图中行为 |
| --- | --- | --- |
| Title | 文本框 | 默认可为数据集名（如 Lab Results）；旁有刷新图标，重置为默认标题 |
| Subtitle | 文本框 | 副标题 |
| Width (px) / Height (px) | 数字步进 | 图表宽高（像素） |
| Opacity | 滑杆 | 柱透明度 |
| Line Width | 滑杆 | 柱描边线宽 |
| Line Color | 色块下拉 | 柱描边颜色（截图为黑色） |
| Color Palette | 下拉 | Light (default) / Dark / Alternate；下方色板小方块预览 |
| Margins (px) | Top / Right / Bottom / Left | 四边距；用于缓解轴标签重叠 |

底部：**Cancel** / **Apply**。

### 2.2 X-Axis / Y-Axis · Label

左侧切到 X-Axis 或 Y-Axis：

| 控件 | 说明 |
| --- | --- |
| Label | 改轴显示名；不改变数据列 |
| 刷新图标 | 恢复为基于字段/聚合的默认标签 |

Y-Axis 示例标签：`Mean of Decimal Field1`（见误差棒截图）。

### 2.3 Y-Axis Range 与 Error Bars

![barError1.png](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=barError1.png)

**Range（截图）：**

| 选项 | 行为 |
| --- | --- |
| Automatic | 自动范围（选中时 Min/Max 灰显） |
| Manual | 启用 Min / Max 手动输入 |

> 源文另述 Y 轴可有 “Automatic across charts / Automatic Within Chart / Manual”。Bar 误差棒截图展示为 Automatic / Manual 两档；细化以实现可见 UI 为准，并保留源文三档表述作对照。

**Error Bars（截图 + 源文）：**

| 条件 | 选项 |
| --- | --- |
| Aggregate Method = Mean | None / Standard Deviation / Standard Error of the Mean |
| 其他聚合 | 误差棒不可用或不展示该组选项 |

截图中选中 **Standard Deviation**。

---

## 3. 其他设置 · 导出

![chartExport.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eb75-ed56-1034-b734-fe851e088836&name=chartExport.PNG)

| 项 | 说明 |
| --- | --- |
| 触发 | 鼠标悬停图表右上角出现导出按钮 |
| PDF | 导出 PDF |
| PNG | 导出 PNG 图片 |

> 同源截图另有 Script 按钮；本次未勾选，不纳入细化范围。

---

## 源命名对照

| 官方文档用语 | UI 可见标签 |
| --- | --- |
| X Axis Categories | X Axis * |
| Split Categories By | Group By |
| Chart Type | Create a plot |
| Chart Layout | Customize look and feel |
