# Benchling · Box Plots（细化版）

> 来源：正文将 Box plot 列为 View Type；change-view-type 截图下拉未露出（可能滚动未展示）  
> **已确认产品纳入 Box**  
> 共性见 [common.md](./common.md)  
> 状态：**已细化**

---

## 已确认范围

### 1. 数据 / 属性
- [x] View Type = Box plot
- [x] X-axis（分类分组）/ Y-axis（数值分布）/ Series
- [x] Error bars
- [x] Color palette / Custom label / 轴齿轮

### 2. STYLE
- [x] Series Color
- [x] Point Shape / Opacity（离群点 / 显示点）
- [x] Legend

### 3. 其他
- [x] Save；Filters & Transforms；Hover
- [x] Show Points 模式
- [x] 箱线统计规则 UI

### 排除
- Jitter（未勾选）

---

## 1. 数据 / 属性设置

### 1.1 View Type = Box plot

| 项 | 说明 |
| --- | --- |
| 入口 | View type → **Box plot**（正文枚举；产品必须提供该选项） |
| 证据强度 | 正文强、截图弱；**勾选确认纳入** |

### 1.2 X / Y / Series

| 槽位 | 说明 |
| --- | --- |
| **X-axis** | 分类 → 沿 X 多箱 |
| **Y-axis** | 数值分布列（箱体统计来源） |
| **Series** | 可选；同类别下再按系列分色拆箱或并排箱 |

齿轮、Custom label、Color palette、X/Y 交换 → common。

### 1.3 Error bars

| 项 | 说明 |
| --- | --- |
| 确认 | Box **开放** Error bars 槽位 |
| 语义 | 若映射数值列，在箱体统计图元上叠加误差指示；与「箱须」统计须区分——误差棒来自列映射，箱须来自四分位规则（见 3.2） |

---

## 2. STYLE

| 项 | 说明 |
| --- | --- |
| Series Color | 逐系列箱体/点着色 |
| Point Shape / Opacity | 作用于 **Show Points** 或离群点 |
| Legend | 显隐 / 方位 / 自定义标题 |

---

## 3. 其他设置

### 3.1 Show Points 模式

| 模式 | 说明 |
| --- | --- |
| 隐藏点 | 仅箱体 + 须 + 离群点（若规则含离群） |
| 显示全部点 | 箱体叠加原始点 |
| 仅离群点 | 仅标出离群 |

入口：STYLE 或 CONFIGURE 的 Show Points 控件。

### 3.2 箱线统计规则 UI

产品需提供可见的统计规则说明或配置（与 LabKey 箱线规则对齐时可参考）：

| 元素 | 默认规则（建议） |
| --- | --- |
| 箱体 | Q1–Q3（IQR） |
| 中位线 | Median |
| 须 | 默认至 1.5×IQR 内最远端点（或 min/max，二选一可配置） |
| 离群 | 须外点 |

UI：只读说明面板，或「须定义」下拉；须在文档与 Hover 中一致。

### 3.3 Save / Filters / Hover

| 项 | 说明 |
| --- | --- |
| Save / Cancel | 同 common |
| Filters & Transforms | 改变箱图输入行 |
| Hover | 箱体：n、median、Q1、Q3、须端；点：原始值与 Series |

### 3.4 Jitter

未勾选 → **不实现** 点抖动。

---

## 源命名对照

| 文档用语 | UI |
| --- | --- |
| Box plot | View type = Box plot |
| Show Points | Show Points / 点显示模式 |
| Whisker rule | 须定义 / 统计规则 |
