# Benchling · Bar Charts（细化版）

> 来源：Benchling Analysis 正文 + View Type / CONFIGURE 截图；共性见 [common.md](./common.md)  
> 范围：仅细化已勾选功能点  
> 状态：**已细化**

---

## 已确认范围

### 1. 数据 / 属性设置
- [x] View Type = Bar chart
- [x] X-axis / Y-axis / Series
- [x] Error bars
- [x] Color palette / Custom label / 轴 settings 齿轮
- [x] 柱方向（竖直 / 水平）
- [x] 堆叠 vs 并排分组
- [x] 柱上聚合（Sum / Mean / Count…）
- [x] 轴范围 / 刻度

### 2. 布局 / 外观（STYLE）
- [x] Series Color
- [x] Point Shape / Opacity
- [x] Legend

### 3. 其他
- [x] Filters & Transforms → 柱图数据

### 排除（本文件未勾选）
- Save / Cancel（由 [common.md](./common.md) 覆盖）
- Hover（由 common 覆盖）

---

## 1. 数据 / 属性设置（CONFIGURE）

### 1.1 View Type = Bar chart

| 项 | 说明 |
| --- | --- |
| 入口 | View type → **Bar chart** |
| 证据 | change-view-type 截图 |

### 1.2 X-axis / Y-axis / Series

| 槽位 | 典型类型 | 说明 |
| --- | --- | --- |
| **X-axis** | 分类（Aa） | 柱分组类别 |
| **Y-axis** | 数值（#） | 柱高度量；可与聚合联动 |
| **Series** | 分类或 `None` | 多系列着色；与「并排 / 堆叠」联动 |

轴旁 **settings 齿轮**、**Custom label**、**Color palette**、**X/Y 交换** 见 common。

### 1.3 Error bars

| 项 | 说明 |
| --- | --- |
| 确认 | 与 Scatter 同源 CONFIGURE 槽位，**Bar 开放** |
| 映射 | 数值列 → 竖直误差棒（水平柱时误差沿度量轴） |
| 空 | 未选列则不显示 |

### 1.4 柱上聚合

| 项 | 说明 |
| --- | --- |
| 场景 | 同一 X（× Series）多行需汇总为柱高 |
| 方式 | 支持 **Count / Sum / Mean / Min / Max / Median**（与上游 Aggregate transform 对齐时可复用变换结果列） |
| 产品 | 在 Y 绑定或轴齿轮内提供聚合选择；切换后 Y 轴标签反映聚合（如 `Mean of …`） |

### 1.5 柱方向

| 选项 | 说明 |
| --- | --- |
| **竖直**（默认） | 分类在 X，度量在 Y |
| **水平** | 分类在 Y，度量在 X（或等价旋转） |

### 1.6 堆叠 vs 并排分组

| 模式 | 条件 | 效果 |
| --- | --- | --- |
| **并排分组** | Series ≠ None | 同类别下多系列柱并排 |
| **堆叠** | Series ≠ None | 同类别下多系列堆叠为单柱 |

入口：CONFIGURE 或 STYLE 中的分组模式开关（产品需二选一控件，默认并排）。

### 1.7 轴范围 / 刻度

| 项 | 说明 |
| --- | --- |
| 入口 | 轴 settings 齿轮 |
| 能力 | 度量轴手动 min / max；刻度密度跟随范围 |
| 默认 | 自动包含 0 与数据极值（含误差棒端点） |

---

## 2. 布局 / 外观（STYLE）

| 项 | 说明 |
| --- | --- |
| **Series Color** | 逐系列色块 + picker（覆盖色板） |
| **Point Shape / Opacity** | 按源规范 STYLE 含 Point；柱图以柱体为主——若该 View Type 暴露 Point 区则可用（如柱顶标记）；否则可对 Bar 隐藏控件但仍保留系列着色 |
| **Legend** | Show/Hide；Position：Left / Right / Top / Bottom；Custom legend label |

---

## 3. 其他设置

| 项 | 说明 |
| --- | --- |
| Filters & Transforms | 改变柱图输入行；聚合可在变换层完成后再绑 Y |

---

## 源命名对照

| 文档用语 | UI / 语义 |
| --- | --- |
| Bar chart | View type = Bar chart |
| Series | 多系列 / 分组着色 |
| Grouped / Stacked | 并排分组 / 堆叠 |
| Orientation | 竖直 / 水平 |
