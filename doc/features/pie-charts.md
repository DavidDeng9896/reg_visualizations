# Pie Charts 功能点初稿（待确认）

> 来源调研：`doc/piechart.md`  
> 状态：仅列功能点，确认后再细化

---

## 1. 数据 / 属性设置（Chart Type）

- [ ] **Categories**：分类列（扇区按唯一值计数 Count 决定大小）
- [ ] **Categories 字段切换**
- [ ] **图表类型切换**：保留所选列切换到其他图表

---

## 2. 布局 / 外观设置（Chart Layout）

- [ ] **Title**：默认数据集名
- [ ] **Subtitle**：默认分类列名（仅改显示，不改分类字段）
- [ ] **Width / Height**
- [ ] **Color Palette**：Light / Dark / Alternate（含色板预览）
- [ ] **Radii（半径）**：控制饼图大小；可设置空心中心（环形图）
- [ ] **百分比标注**：  
  - 是否在扇区内显示百分比  
  - 百分比文字颜色  
  - 窄扇区隐藏阈值（默认 <5% 隐藏）
- [ ] **Gradient % + Gradient Color**：渐变阴影效果

---

## 3. 其他设置

- [ ] **数据过滤联动**：View Data / Filter / View Chart
- [ ] **保存设置**：名称、描述、可见性、缩略图
- [ ] **导出**：PDF / PNG
- [ ] **入口与管理**：Data Browser、(Charts) 菜单、视图元数据管理

---

## 备注（待确认是否纳入细化）

- Pie 无 X/Y 轴、无误差棒、无第二轴；功能点相对精简。
- 是否需要补充「度量值字段（非 Count）」类扩展需求（原文默认 Count）请确认。
