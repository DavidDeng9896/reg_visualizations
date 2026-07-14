# Line Plots 功能点初稿（待确认）

> 来源调研：`doc/lineplot.md`  
> 状态：仅列功能点，确认后再细化

---

## 1. 数据 / 属性设置（Chart Type）

- [ ] **X Axis**：横轴字段（常为时间/日期）
- [ ] **Y Axis**：纵轴度量字段（可多度量）
- [ ] **Series（系列）**：按列取值拆成多条线（如 Participant ID）
- [ ] **Second Y Axis**：添加第二 Y 度量，并设置左右侧（Y Axis Side）
- [ ] **Trendline 类型（Premium）**：  
  - Point-to-Point（默认）  
  - Linear Regression  
  - Polynomial  
  - Nonlinear 3PL / 3PL Alternate / 4PL / 4PL Alternate / 5PL  
- [ ] **非线性趋势线附加参数**：渐近线 min/max（条件显示）
- [ ] **字段增删与图表类型切换**

---

## 2. 布局 / 外观设置（Chart Layout）

### 2.1 General

- [ ] **Title / Subtitle**
- [ ] **Width / Height**
- [ ] **Point Size / Opacity / Default Color**（无 Series 时）
- [ ] **Line Width**
- [ ] **Hide Data Points**：仅显示连线、隐藏数据点
- [ ] **Number of Charts**：单图 / 每度量一图
- [ ] **Margins (px)**：上/下/左/右（可解决轴标签重叠）

### 2.2 X-Axis

- [ ] **Label**（可刷新恢复）

### 2.3 Y-Axis

- [ ] **Label**
- [ ] **Scale Type**：Linear / Log
- [ ] **Range**：Automatic across charts / Automatic Within Chart / Manual(min/max)
- [ ] **Aggregate Method**：None / Sum / Min / Max / Mean / Median
- [ ] **Error Bars**：None / Standard Deviation / Standard Error of the Mean

### 2.4 Developer（可选）

- [ ] **点击点 JS 回调**

---

## 3. 其他设置

- [ ] **数据过滤联动**：View Data → Filter → View Chart（控制系列密度）
- [ ] **趋势线交互**：悬停显示统计与曲线拟合参数
- [ ] **趋势线作用范围**：按 series 分别应用；无 series 时作用于全部点
- [ ] **保存设置**：名称、描述、可见性、缩略图；保留 trendline 选择
- [ ] **导出**：PDF / PNG
- [ ] **入口与管理**：Data Browser、(Charts) 菜单、视图元数据管理

---

## 备注（待确认是否纳入细化）

- Trendline 为 Premium / 条件可用能力，是否纳入首版范围请确认。
- Developer 扩展是否纳入请确认。
- 「边距调整」可作为独立体验要点，或并入 Margins 配置项。
