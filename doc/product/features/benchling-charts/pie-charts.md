# Benchling · Pie Charts 功能点初稿（待确认）

> 参考：Benchling Analysis → View Type = Pie chart + 共性 Configure/Style  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置

- [ ] **View Type = Pie chart**
- [ ] **分类 / 数值映射**（源文统一写 X/Y/Series；Pie 具体槽位需对照 UI 确认）
  - [ ] 是否用某一轴作 Categories
  - [ ] 是否用 Series 区分扇区
  - [ ] 度量是否默认 Count
- [ ] **Custom label**（若有轴/系列标签场景）

---

## 2. 布局 / 外观设置（继承共性 Style）

- [ ] **Series/扇区 Color** 逐项取色
- [ ] **Legend** 显示 / 方位 / 自定义标题
- [ ] **Point Shape / Opacity**（源称 except regressions；Pie 是否暴露请确认）

---

## 3. 其他设置

- [ ] Apply
- [ ] View Type 切换
- [ ] 上游 Filters/Transforms

---

## 源文缺口（是否扩展请确认）

- [ ] 环形图（内外半径）
- [ ] 扇区百分比标注与窄扇区隐藏阈值
- [ ] 渐变 Gradient
- [ ] 非 Count 度量聚合
