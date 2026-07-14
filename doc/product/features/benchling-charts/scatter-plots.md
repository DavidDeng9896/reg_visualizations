# Benchling · Scatter Plots 功能点初稿（待确认）

> 关键截图：`configure-chart.png`（Scatter + Error bars）  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（CONFIGURE · 截图核对）

- [ ] **View Type = Scatter plot**
- [ ] **X-axis**（示例：Sample ID，Aa）+ settings 齿轮
- [ ] **Y-axis**（示例：Average of Calculated Concentration，#）+ settings 齿轮
- [ ] **Series**（示例：None；可按列分组着色）
- [ ] **Error bars**（示例：Standard error of Calculated Concentration；图上为竖直误差棒）
- [ ] **Color palette**（示例：Benchling (30)）
- [ ] **Custom label**（正文）
- [ ] **Save / Cancel**

---

## 2. 布局 / 外观设置（STYLE）

- [ ] **Series Color** 逐系列取色
- [ ] **Point Shape**（截图点为方块等）
- [ ] **Point Opacity**
- [ ] **Legend** 显隐 / Left·Right·Top·Bottom / Custom label

---

## 3. 其他设置

- [ ] **+ FILTERS & TRANSFORMS**
- [ ] Hover Tooltip（回归 GIF 同类：显示 X/Y/系列字段值）
- [ ] 网格线（截图有浅色网格）
- [ ] 与 Regression View 的关系（回归基于散点 + 拟合线）

---

## 源文缺口

- [ ] 水平误差棒
- [ ] 点大小映射第三度量
- [ ] Jitter / 密度分箱（或改用 Heatmap）
- [ ] 双 Y（标准 Scatter；多 Y 见 Custom code）
