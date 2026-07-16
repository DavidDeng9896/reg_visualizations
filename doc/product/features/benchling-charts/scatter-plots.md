# Benchling · Scatter Plots（细化版）

> 来源：`configure-chart.png` 截图核对 + 正文 Style/Configure  
> 共性见 [common.md](./common.md)  
> 状态：**已细化**

**关键截图：**

![configure-chart](https://help.benchling.com/hc/article_attachments/46023921660173)

---

## 已确认范围

### 1. CONFIGURE
- [x] View Type = Scatter plot
- [x] X-axis / Y-axis + settings 齿轮
- [x] Series
- [x] Error bars（竖直；源例）
- [x] Color palette
- [x] Custom label
- [x] Save / Cancel
- [x] 水平误差棒
- [x] 点大小映射第三度量
- [x] Jitter / 密度分箱（或改用 Heatmap）
- [x] 双 Y

### 2. STYLE
- [x] Point Shape
- [x] Point Opacity

### 3. 其他
- [x] Hover Tooltip
- [x] 网格线
- [x] 与 Regression View 的关系（说明性；回归本身不纳入）

### 排除（本文件未勾选）
- Series Color 逐系列取色（散点专章不展开；其他图种见 common）
- Legend（散点专章不展开）
- + FILTERS & TRANSFORMS（见 common）

---

## 1. 数据 / 属性设置（CONFIGURE）

### 1.1 侧栏结构（截图）

| 控件 | 截图取值例 |
| --- | --- |
| View type | Scatter plot |
| X-axis | Sample ID（Aa） |
| Y-axis | Average of Calculated Concentration（#） |
| Series | None |
| Error bars | Standard error of Calculated Concentration（#） |
| Color palette | Benchling (30) |
| 底部 | Cancel / Save；+ FILTERS & TRANSFORMS |

### 1.2 X / Y / Series

| 槽位 | 说明 |
| --- | --- |
| X | 分类或数值；例中为 Sample ID 类别点 |
| Y | 数值；例中为聚合后的 Average of … |
| Series | `None` = 单色单系列；选列则按值着色分组 |

### 1.3 Error bars

| 方向 | 状态 | 说明 |
| --- | --- | --- |
| **竖直** | 截图可见 | 映射数值列；点上下误差 |
| **水平** | **已确认纳入** | CONFIGURE 增加水平误差列映射（或 Error bars 槽支持方向：Vertical / Horizontal / Both） |

未映射则不绘制对应方向误差棒。

### 1.4 点大小映射第三度量

| 项 | 说明 |
| --- | --- |
| 槽位 | CONFIGURE 增加 **Size**（或等价格式）绑定数值列 |
| 效果 | 点半径随度量缩放；需图例或 Hover 标明 Size 字段 |
| 空 | 未绑定时使用 STYLE 默认点大小 |

### 1.5 Jitter / 密度分箱

| 项 | 说明 |
| --- | --- |
| **Jitter** | 类别轴上点重叠时施加少量随机位移 |
| **密度分箱** | 极密散点可分箱聚合展示；或引导改用 [Heatmap](./heatmaps.md) |
| 入口 | STYLE 或轴齿轮开关 |

### 1.6 双 Y

| 项 | 说明 |
| --- | --- |
| 标准 Scatter | 支持第二 Y 度量（左/右纵轴）；与 Series 着色可并存 |
| 多 Y（≥3） | 见 [line-charts.md](./line-charts.md) Custom code / Plotly，不在标准 Scatter 表单强制 |

### 1.7 Custom label / Color palette / Save

见 [common.md](./common.md)。

---

## 2. 布局 / 外观（STYLE）

| 项 | 说明 |
| --- | --- |
| **Point Shape** | 标记形状（截图点可为方块等） |
| **Point Opacity** | 透明度滑杆 |

本专章**不**细化 Series Color、Legend（未勾选）；实现若复用 common 组件，散点默认可不暴露或保持关闭。

---

## 3. 其他设置

### 3.1 Hover Tooltip

显示 X、Y 字段值；有 Series / Size / Error 时一并展示。

### 3.2 网格线

| 项 | 说明 |
| --- | --- |
| 默认 | 浅色网格（截图可见） |
| 产品 | 散点默认开启网格 |

### 3.3 与 Regression 的关系

| 项 | 说明 |
| --- | --- |
| 源产品 | 回归 = 散点 + 拟合线（Advanced Analysis） |
| 本产品 | **Regression**；散点独立交付，实现拟合/打标/MODEL TABLES |

---

## 源命名对照

| 文档用语 | UI |
| --- | --- |
| Scatter plot | View type = Scatter plot |
| Error bars | Error bars |
| Size | Size（第三度量，产品命名） |
| Dual Y | 第二 Y / Y Axis Side |
