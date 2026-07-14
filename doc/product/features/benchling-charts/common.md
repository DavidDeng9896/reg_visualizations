# Benchling 图表共性配置 · 功能点初稿（待确认）

> 参考：`doc/reference/benchling/analyze-data-with-benchling-analysis.md` → *Analysis Charting Capabilities*  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（Configure）

- [ ] **View Type 切换**：在右侧设置面板将 View 改为 table / bar / line / scatter / box / heatmap / pie / regression 等
- [ ] **X axis**：下拉映射列
- [ ] **Y axis**：下拉映射列
- [ ] **Series**：下拉映射系列列（多系列着色/分组）
- [ ] **Custom label（轴）**：在 Configure 中为 X/Y 覆盖默认列名标签
- [ ] **Apply**：保存配置（侧边栏修改后需 Apply）

---

## 2. 布局 / 外观设置（Style）

> 原文：Style 选项适用于所有图表类型，**regression 除外**（除非另行说明）。

- [ ] **Color（按系列取色）**：为每个 data series 指定颜色（非仅默认色板）
- [ ] **Point · Shape**：数据点/标记形状
- [ ] **Point · Opacity**：点透明度滑杆
- [ ] **Legend · Show/Hide**：图例显示开关
- [ ] **Legend · Position**：Left / Right / Top / Bottom
- [ ] **Legend · Custom legend label**：自定义图例标题

---

## 3. 其他设置（与图表相关的周边能力）

- [ ] **从 Analysis Table 创建 Chart View**（New view → 选图表类型）
- [ ] **编辑入口**：View 右上角 edit 打开配置侧栏
- [ ] **Promote 图形 View**：将底层数据表提升为 Analysis Table（编辑态可见底层表）
- [ ] **Filters & Transforms 影响作图数据**：过滤/转换结果作为图表输入（表侧能力，图消费结果）
- [ ] **Embed charts in Notebook**（As chart）/ Worksheet（Bioprocess）
- [ ] **Create outputs 锁定上游**：输出图表后锁定相关 Analysis 步骤

---

## 备注（供确认）

- 原文未单独列出：图标题、宽高、边距、误差棒、双 Y、分面等；若产品需要，请标明为**扩展需求**而非 Benchling 源能力。
- Color / Point / Legend 是否对 Pie、Heatmap、Bar 全部适用，原文写「all chart types except regressions」——细化时建议对照实际 UI 再校验。
