# Benchling · Regressions 功能点初稿（待确认）

> 参考：*Regressions* / *Flag outliers on regressions* / *Interpolations*  
> 前置：Advanced Analysis  
> 状态：初稿，请勾选后再细化

---

## 1. 数据 / 属性设置（Configure · Regression）

- [ ] **创建 Regression View**（在含 X/Y 的表下 New view → Regression）
- [ ] **X axis / Y axis** 列选择
- [ ] **回归模型 Type**
  - [ ] Linear
  - [ ] Quadratic
  - [ ] 4PL
- [ ] **Weights**（点权重；默认等权）
- [ ] **4PL constraints**（约束；默认算法自动确定）
- [ ] **Apply** 生成回归并将回归线叠加到图上
- [ ] 回归 View 内可再 **Filter / Transform** 源数据

---

## 2. 布局 / 外观设置

- [ ] 基于 **Scatter** 呈现 + 回归线叠加（源：configure the scatter plot and edit the regression）
- [ ] 标准 Style（Color/Point/Legend）对 Regression **默认不适用**（源：except regressions）——是否单独外观项请确认
- [ ] 回归结果表展示区（图下方）
  - [ ] Source Table
  - [ ] Model Output Table（预测、残差等）
  - [ ] Model Variables Table（参数与置信区间；Linear：slope/intercept；4PL：Min/Max/Hill Slope/Inflection）

---

## 3. 其他设置

### 3.1 可视化打标（Visual flagging）

- [ ] 在回归图上框选/点选异常点并 **Flag**（必填 comment）
- [ ] **Unflag**（必填 comment）
- [ ] **Exclude Flagged Values**：拟合时排除打标点（点仍可见；取消勾选后重新纳入）
- [ ] 若要从图上视觉移除打标点：用 Filter `Flag = false`

### 3.2 Interpolation（下游变换）

- [ ] 在其他 View 的 Transformations 中引用回归做插值
- [ ] 可选 **Series** 分组插值
- [ ] Promote 后把插值结果用于其他图表/表

### 3.3 权限与可用性

- [ ] 仅 Advanced Analysis 用户可用 Regression / Interpolation

---

## 备注

- Regression 是 Benchling 相对 LabKey 产品功能点中**更独立、文档更细**的一块；是否纳入本产品首期请明确勾选。
