# Bar Charts 功能点初稿（待确认）

> 来源调研：`doc/barchart.md`  
> 状态：仅列功能点，确认后再细化

---

## 1. 数据 / 属性设置（Chart Type）

- [ ] **X Axis Categories**：选择分类列，作为柱的分组依据（基础必选）
- [ ] **Y Axis 度量列**：可选；未设置时默认按行数 Count 作为柱高
- [ ] **Aggregate Method（聚合方式）**：如 SUM / Mean 等；影响柱高计算与 Y 轴标签
- [ ] **Split Categories By（分组拆分）**：生成分组柱状图（Grouped Bars）+ 图例色映射
- [ ] **字段角色切换**：拖拽字段在 X / Y / Split 等选择框间互换用途
- [ ] **图表类型切换**：在保留轴字段的前提下切换到其他图表类型

---

## 2. 布局 / 外观设置（Chart Layout）

### 2.1 General

- [ ] **Title**：图表标题（默认可恢复为数据集名）
- [ ] **Subtitle**：副标题
- [ ] **Width / Height**：图表宽高
- [ ] **Bar 外观**：透明度 Opacity、线宽 Line Width、线颜色 Line Color
- [ ] **Fill Color Palette**：柱填充色板（Light / Dark / Alternate）
- [ ] **Margins (px)**：上/下/左/右边距

### 2.2 X-Axis / Y-Axis

- [ ] **Axis Label**：轴显示标签（可刷新恢复为字段名）
- [ ] **Y-Axis Range**：Automatic across charts / Automatic Within Chart / Manual(min/max)

### 2.3 Error Bars（与聚合联动）

- [ ] **Error Bars**：当 Aggregate Method = Mean 时可选  
  - None  
  - Standard Deviation  
  - Standard Error of the Mean

---

## 3. 其他设置

- [ ] **数据过滤联动**：View Data → Filter（如去除 Blank）→ View Chart 重算
- [ ] **保存设置**：名称、描述、是否对他人可见、缩略图（默认/自定义）
- [ ] **导出**：PDF / PNG
- [ ] **入口与管理**：出现在 Data Browser、(Charts) 菜单；可管理视图元数据

---

## 备注（待确认是否纳入细化）

- 官方文档中 Bar Layout 细节部分依赖截图补充，初稿已按原文列表项还原；若需实现级字段枚举，建议细化阶段对照 UI 截图再校对一次。
