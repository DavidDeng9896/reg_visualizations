# Benchling · Bar Charts 功能点初稿（待确认）

> 参考：Benchling Analysis → View Type = Bar chart + 共性 Configure/Style  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置

- [ ] **View Type = Bar chart**
- [ ] **X axis** 列映射
- [ ] **Y axis** 列映射
- [ ] **Series** 列映射（多系列柱/分组着色）
- [ ] **X/Y Custom label**

---

## 2. 布局 / 外观设置（继承共性 Style）

- [ ] **Series Color** 逐系列取色
- [ ] **Point Shape / Opacity**（若 Bar 上展示标记时适用；源称 except regressions）
- [ ] **Legend** 显示 / 方位（L/R/T/B）/ 自定义标题

---

## 3. 其他设置

- [ ] Apply 保存配置
- [ ] 切换自其他 View Type 到 Bar（或反之）
- [ ] 上游 Filters/Transforms 决定柱图数据

---

## 源文缺口（是否扩展请确认）

- [ ] 柱方向（竖直/水平）
- [ ] 堆叠 / 分组柱
- [ ] 聚合方式（Sum/Mean/Count…）
- [ ] 误差棒
- [ ] 柱宽/间距、坐标轴范围与刻度
