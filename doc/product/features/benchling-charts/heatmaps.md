# Benchling · Heatmaps 功能点初稿（待确认）

> 参考：Benchling Analysis → View Type = Heatmap（列表中明确支持）  
> 状态：初稿，请勾选后再细化  

> 注意：源文将 Heatmap 列为图表类型，但 **未单独描述** 热力图专属配置项；以下多为共性项 + 缺口待确认。

---

## 1. 数据 / 属性设置

- [ ] **View Type = Heatmap**
- [ ] **X axis** 列映射（行/列类别之一）
- [ ] **Y axis** 列映射
- [ ] **Series / 颜色度量**（热力值字段如何映射——源未写清，需确认）
- [ ] **Custom label**

---

## 2. 布局 / 外观设置

- [ ] **Color**（色阶或系列色——源 Style 偏系列色块，热力色阶是否同一入口请确认）
- [ ] **Legend** 显示 / 方位 / 自定义标题
- [ ] **Point Shape / Opacity**（热力场景是否适用请确认）

---

## 3. 其他设置

- [ ] Apply
- [ ] View Type 切换（含 Promote 时提升底层表）
- [ ] 上游 Filters/Transforms；Bin data 等转换是否常与热力配合

---

## 源文缺口（是否扩展请确认）

- [ ] 色阶类型（连续色带 / 离散）
- [ ] 单元格标注（数值文字）
- [ ] 聚类 / 排序
- [ ] 与 Scatter 密度热力的产品边界
