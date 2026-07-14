# Benchling · Bar Charts 功能点初稿（待确认）

> 参考正文 + View Type 截图；Bar 专属 CONFIGURE/STYLE 细项原文较少，共性项见 [common.md](./common.md)  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置

- [ ] **View Type = Bar chart**（change-view-type 截图可见）
- [ ] **X-axis**（通常分类，Aa）
- [ ] **Y-axis**（通常数值，#）
- [ ] **Series**（多系列柱/分组着色）
- [ ] **Error bars**（若 CONFIGURE 在 Bar 同样暴露——截图在 Scatter 可见，Bar 是否同源请确认）
- [ ] **Color palette**
- [ ] **X/Y Custom label**
- [ ] 轴字段 **settings 齿轮**

---

## 2. 布局 / 外观设置（STYLE）

- [ ] **Series Color** 逐系列取色
- [ ] **Point Shape / Opacity**（源称 except regressions；Bar 是否显示请确认）
- [ ] **Legend** 显隐 / 方位 / 自定义标题

---

## 3. 其他设置

- [ ] Save / Cancel
- [ ] Filters & Transforms → 柱图数据
- [ ] Hover（若有）

---

## 源文/截图仍未明确（扩展请勾选）

- [ ] 柱方向（竖直/水平）
- [ ] 堆叠 vs 并排分组
- [ ] 柱上聚合（Sum/Mean/Count…）——可能依赖上游 Aggregate transform
- [ ] 轴范围 / 刻度
