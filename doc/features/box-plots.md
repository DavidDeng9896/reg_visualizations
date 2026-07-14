# Box Plots 功能点初稿（待确认）

> 来源调研：`doc/boxplot.md`  
> 状态：仅列功能点，确认后再细化

---

## 1. 数据 / 属性设置（Chart Type）

- [ ] **Y Axis**：测量值列（基础必选；可先画单箱线图）
- [ ] **X Axis Categories**：按分类列生成多箱（每个取值一个 box）
- [ ] **Color 分组**：按列值着色（适合显示全部点/离群点时）
- [ ] **Shape 分组**：按列值改变点形状（文档提及约 5 种形状）
- [ ] **字段增删与互换**：删除当前选择、拖拽调整字段角色
- [ ] **图表类型切换**：保留字段切换到其他图表类型

---

## 2. 布局 / 外观设置（Chart Layout）

### 2.1 General

- [ ] **Title / Subtitle**
- [ ] **Width / Height**
- [ ] **Show Points**：全部点 / 仅离群点 / 不显示
- [ ] **Jitter Points**：水平抖动，避免点重叠
- [ ] **点/线外观**：颜色、透明度、宽度、填充等
- [ ] **Margins (px)**：上/下/左/右边距

### 2.2 X-Axis

- [ ] **Label**：轴标签（可刷新恢复）

### 2.3 Y-Axis

- [ ] **Label**
- [ ] **Scale Type**：Linear / Log
- [ ] **Range**：Automatic / Manual(min/max)

### 2.4 Developer（可选）

- [ ] **点击点回调**：自定义 JS（需 Platform Developers 角色）

---

## 3. 其他设置

- [ ] **数据过滤联动**：View Data / Filter / View Chart
- [ ] **Hover 信息**：悬停箱体或点查看统计/明细
- [ ] **箱线图渲染规则（只读能力）**  
  - Min/Max（IQR×1.5 内）  
  - Q1 / Q2(中位数) / Q3  
  - 离群点以点显示
- [ ] **保存设置**：名称、描述、可见性、缩略图（含可选 None）
- [ ] **导出**：PDF / PNG
- [ ] **入口与管理**：Data Browser、(Charts) 菜单、视图元数据管理

---

## 备注（待确认是否纳入细化）

- 「渲染规则」属于统计语义，不是交互配置项；是否写入功能点文档请确认。
- Developer 扩展是否纳入产品功能范围请确认。
