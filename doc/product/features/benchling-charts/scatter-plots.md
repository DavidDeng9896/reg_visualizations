# Benchling · Scatter Plots 功能点初稿（待确认）

> 参考：Benchling Analysis → View Type = Scatter plot；Regression 编辑侧栏也基于散点  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置

- [ ] **View Type = Scatter plot**
- [ ] **X axis** 列映射
- [ ] **Y axis** 列映射
- [ ] **Series** 列映射（点分组着色）
- [ ] **X/Y Custom label**

---

## 2. 布局 / 外观设置（继承共性 Style）

- [ ] **Series Color**
- [ ] **Point Shape**
- [ ] **Point Opacity**
- [ ] **Legend** 显示 / 方位 / 自定义标题

---

## 3. 其他设置

- [ ] Apply
- [ ] View Type 切换
- [ ] 与 **Regression** View 的关系（回归图基于散点 + 拟合线，见 [regressions.md](./regressions.md)）
- [ ] 上游 Filters/Transforms

---

## 源文缺口（是否扩展请确认）

- [ ] 点大小映射（第三度量）
- [ ] 抖动 Jitter
- [ ] 密度/分箱热力（或使用独立 Heatmap）
- [ ] 双 Y 轴
