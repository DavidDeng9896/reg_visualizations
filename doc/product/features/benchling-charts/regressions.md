# Benchling · Regressions 功能点初稿（待确认）

> 截图/GIF：`regression-config`、`exclude-flagged`、`visual-flagging.gif` 拆帧、`regression-result`  
> Advanced Analysis  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（侧栏 · 视觉核对）

### SETUP

- [ ] **View type**（常为 Scatter plot / Regression 上下文）
- [ ] **X-axis** 列
- [ ] **Y-axis** 列
- [ ] **X/Y Swap** 按钮
- [ ] **Series**（示例：Compound → 多化合物多曲线）
- [ ] **Color palette**（色块条 + 预设）

### REGRESSION

- [ ] **Regression model**（截图：`4-parameter logistic`；正文：Linear / Quadratic / 4PL）
- [ ] **Weights**（None / 其他；带帮助图标）
- [ ] **Exclude flagged values** 复选框（排除打标点参与拟合；点仍以 **×** 显示）
- [ ] **Constraints** 折叠区（4PL 约束；默认算法确定）
- [ ] **Apply / Cancel**

### 数据与表

- [ ] 回归 View 内可 **+ Add filter**
- [ ] 大数据 **随机抽样提示**（如 1000 / 4177）+ Download 完整数据
- [ ] 底栏 Tab：
  - [ ] **SOURCE TABLE**
  - [ ] **MODEL OUTPUT TABLE**（预测、残差等）
  - [ ] **MODEL VARIABLES**（Linear：slope/intercept；4PL：Min/Max/Hill Slope/Inflection + 置信区间）

---

## 2. 布局 / 外观 / 图形表现（GIF 可见）

- [ ] 散点 + **拟合曲线**（线性/二次/4PL S 曲线）
- [ ] **多 Series** 分色点与曲线（图例右上）
- [ ] **对数 X 轴**（剂量-反应示例：Concentration 0.01…1e+5）
- [ ] 线性 Y 轴（Percent Inhibition）
- [ ] 网格线
- [ ] 打标点样式：**×**（相对普通实心点）
- [ ] 标准 STYLE（Color/Point/Legend）正文称对 regression **默认不适用**——请确认是否另有外观项

---

## 3. 其他设置 · Visual Flagging（GIF 拆帧）

- [ ] 工具栏 **Flag** / **Clear**
- [ ] **套索/多边形选点**（虚线锚点框选）
- [ ] Flag 需 **comment**；Unflag 需 comment
- [ ] **Hover Tooltip**：Concentration / Percent Inhibition / Compound 等
- [ ] 排除拟合后仍显示点；要从图上去掉需 Filter `Flag = false`
- [ ] Flowchart 节点输出：Model chart / Model variables / Output dataset

### Interpolation（正文 + Transforms 菜单）

- [ ] Transformations：**Calculate interpolation**
- [ ] 可选 Series 分组插值
- [ ] Promote 后用于其他图/表

---

## 视觉核对备注

| 发现 | 来源 |
| --- | --- |
| 4PL + Exclude flagged + Constraints | exclude-flagged 截图 |
| 套索打标、Flag/Clear、多化合物曲线、log X | visual-flagging.gif |
| 拟合曲线叠加散点 | regression-result.png |
| SETUP 含 Series + Color palette + 轴交换 | regression-config / exclude-flagged |
