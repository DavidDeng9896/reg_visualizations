# Benchling · Line Charts 功能点初稿（待确认）

> 参考正文 + View Type 截图；Advanced Visualizations GIF 含色谱图折线（Custom code/Plotly）  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（标准 Line View）

- [ ] **View Type = Line chart**
- [ ] **X-axis / Y-axis / Series**
- [ ] **Error bars**（是否对 Line 开放请确认）
- [ ] **Color palette**
- [ ] **Custom label** / 轴 settings 齿轮

---

## 2. 布局 / 外观设置（STYLE）

- [ ] **Series Color**
- [ ] **Point Shape / Opacity**（折线节点标记）
- [ ] **Legend** 显隐 / 方位 / 自定义标题

---

## 3. 其他设置

- [ ] Save / Cancel；Filters & Transforms
- [ ] Hover Tooltip

---

## Custom code / Plotly 折线（GIF 可见，属高级可视化）

> Advanced Visualizations GIF：用 Plotly 做 Chromatogram，**非**标准 Line View 表单。

- [ ] 多 Trace（多系列线：颜色、dash：solid/dash/dot）
- [ ] **多 Y 轴**（y / y2 / y3，右侧 overlay、position 偏移）
- [ ] Layout：Title、X 标题、plot_bgcolor、Legend title
- [ ] 峰值标注（scipy.find_peaks → 点标记）
- [ ] Output charts 作为流程节点输出

---

## 源文缺口（标准 Line）

- [ ] 线宽 / 线型（无代码时）
- [ ] 隐藏数据点只留线
- [ ] 对数轴（回归图可见 log X，Line 是否通用请确认）
