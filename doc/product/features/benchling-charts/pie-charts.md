# Benchling · Pie Charts（细化版）

> 来源：View Type 截图含 Pie chart；CONFIGURE 槽位源未单独截到 Pie 专用面板  
> 共性见 [common.md](./common.md)  
> 状态：**已细化**

---

## 已确认范围

### 1. 数据 / 属性
- [x] View Type = Pie chart
- [x] 分类 / 度量映射到 X / Y / Series（与源三槽位对齐）
- [x] Color palette
- [x] Custom label（若适用）
- [x] 环形半径
- [x] 百分比标注与标签隐藏
- [x] 度量非 Count（聚合）

### 2. STYLE
- [x] 扇区 / 系列 Color 取色
- [x] Legend
- [x] Point Shape / Opacity（能力位；Pie 无点时可隐藏控件）

### 排除
- Save；Filters & Transforms（本文件未勾选 → 由 [common.md](./common.md) 统一提供即可，Pie 不另写）

---

## 1. 数据 / 属性设置

### 1.1 View Type = Pie chart

View type → **Pie chart**（change-view-type 截图可见）。

### 1.2 槽位映射（对齐源「X / Y / Series」三槽）

源统一写三槽位；Pie 实机未单独截到时，产品约定：

| 源槽位 | Pie 语义 | 说明 |
| --- | --- | --- |
| **X-axis**（或 Categories） | **扇区分类** | 每个取值一块扇区（Aa） |
| **Y-axis** | **扇区度量** | 数值列；见聚合 |
| **Series** | 可选拆分 | 若使用：按 Series 生成多饼或分面（实现选一种，文档默认「按 Series 分面多饼」） |

Color palette、轴/分类 Custom label（图标题或分类维标签）→ common 模式。

### 1.3 度量非 Count（聚合）

| 项 | 说明 |
| --- | --- |
| 默认 | 无 Y 时扇区 = 分类 **Count** |
| 有 Y | 对分类聚合：**Sum / Mean / Min / Max / Median / Count** |
| 扇区角度 | 与聚合后度量成正比（负值需剔除或取绝对值策略，产品默认剔除并提示） |

### 1.4 环形半径

| 项 | 说明 |
| --- | --- |
| 控件 | 内径比例 0–1（0 = 实心饼，>0 = 甜甜圈） |
| 入口 | STYLE 或 CONFIGURE |

### 1.5 百分比标注与标签隐藏

| 项 | 说明 |
| --- | --- |
| 百分比 | 扇区旁或内显示占比；可开关 |
| 分类名标签 | 可开关；关闭后依赖 Legend |
| 过小扇区 | 可自动隐藏标注避免重叠 |

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| **Color** | 按扇区/系列取色（覆盖色板） |
| **Legend** | 显隐 / Left·Right·Top·Bottom / Custom label |
| **Point Shape / Opacity** | 已勾选保留能力位；**Pie 无散点几何时 UI 隐藏 Point 区**，不阻塞扇区着色 |

---

## 源命名对照

| 文档用语 | UI / 语义 |
| --- | --- |
| Pie chart | View type = Pie chart |
| Categories | X-axis / 分类槽 |
| Measure | Y-axis + 聚合 |
| Hole / Inner radius | 环形半径 |
| Percent labels | 百分比标注 |
