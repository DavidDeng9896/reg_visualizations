# Scatter Plots 功能点初稿（待确认）

> 来源调研：`doc/scatterplot.md`  
> 状态：仅列功能点，确认后再细化

---

## 1. 数据 / 属性设置（Chart Type）

- [ ] **X Axis**：数值字段（必选）
- [ ] **Y Axis**：数值字段（必选；可多度量）
- [ ] **Second Y Axis**：第二 Y 度量 + 左右侧设置（Y Axis Side）
- [ ] **Color 分组**：按列值着色
- [ ] **Shape 分组**：按列值改变点形状
- [ ] **字段增删与图表类型切换**（可保留轴与 color/shape 分组）

---

## 2. 布局 / 外观设置（Chart Layout）

### 2.1 General

- [ ] **Title / Subtitle**
- [ ] **Width / Height**
- [ ] **Jitter Points**：点抖动
- [ ] **Point Size / Opacity**
- [ ] **Color Palette**：Light（默认）/ Dark / Alternate
- [ ] **Number of Charts**：One Chart / One Per Measure
- [ ] **Group By Density（点分箱/密度）**：  
  - Always  
  - When points > 10,000
- [ ] **Grouped Data Shape**：Hexagon / Square
- [ ] **Density Color Palette**：Blue & White / Heat / 单色渐变  
  （启用后覆盖默认色板及其他部分点选项）
- [ ] **Margins (px)**

### 2.2 X-Axis / Y-Axis

- [ ] **Label**（可刷新恢复）
- [ ] **Scale Type**：Linear / Log（各轴独立）
- [ ] **Range**：Automatic / Manual(min/max)（各轴独立）

### 2.3 Developer（可选）

- [ ] **点击点 JS 回调**

---

## 3. 其他设置

- [ ] **数据过滤联动**：View Data / Filter / View Chart
- [ ] **Heat Map 模式**：通过密度分箱布局实现（非独立图表类型）
- [ ] **分箱告警提示**：点数超限时提示并覆盖部分布局选项；可 Dismiss
- [ ] **多度量分面**：Number of Charts = One Per Measure 时，仍尊重 Y Axis Side
- [ ] **保存设置**：名称、描述、可见性、缩略图
- [ ] **导出**：PDF / PNG
- [ ] **入口与管理**：Data Browser、(Charts) 菜单、视图元数据管理

---

## 备注（待确认是否纳入细化）

- Heat Map / Density Binning 是否作为独立重点能力请确认。
- Developer 扩展是否纳入请确认。
