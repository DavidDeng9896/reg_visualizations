# Benchling · Heatmaps 功能点初稿（待确认）

> **GIF 拆帧（left-sidebar）可见完整热力图 UI**，比正文详细  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（视觉核对）

- [ ] **View Type = Heatmap**（截图下拉可见）
- [ ] **X 维**：示例轴标题 **Coordinates Column**（列坐标 1…N）
- [ ] **Y 维**：示例轴标题 **Coordinates Row**（行坐标 0…N）
- [ ] **颜色度量**：图例标题示例 **Percent Inhibition**（连续值 → 色阶）
- [ ] 标准 CONFIGURE 的 X/Y/Series/Color palette 是否同一套入口（请确认）
- [ ] Flowchart 节点 I/O（GIF）：
  - [ ] Input dataset
  - [ ] Output chart
  - [ ] Output dataset
  - [ ] **Sampled output dataset**（大数据采样输出）

---

## 2. 布局 / 外观设置

- [ ] **连续色阶图例**（右侧竖条，0→100 由浅到深；与系列色块不同）
- [ ] 单元格填充色映射强度
- [ ] Legend 方位（热力色阶位置；STYLE Legend 是否共用请确认）
- [ ] 图表标题（示例：`96WP033_Heatmap`）+ Edit / More 菜单

---

## 3. 其他设置

- [ ] **Hover Tooltip**（GIF）：显示 Coordinates Column、Coordinates Row、Percent Inhibition 精确值
- [ ] 侧栏搜索按 “heatmap” 过滤视图
- [ ] Save；Filters & Transforms（常接在 Filter table 节点后）
- [ ] SPLIT WORKSPACE

---

## 源文缺口

- [ ] 色阶类型切换（蓝白 / 其他）
- [ ] 单元格内数值标注开关
- [ ] 行列聚类/排序
