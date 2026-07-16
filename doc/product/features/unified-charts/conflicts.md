# 统一图表 · 冲突 / 待决勾选清单

> **请你勾选后回复「已勾选」**（或直接改本文件 PR）。未勾选项在写 `unified-charts` 细则前不会擅自定稿。  
> 设计说明：[`../../../../docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md`](../../../../docs/superpowers/specs/2026-07-16-unified-charts-merge-design.md)  
> 溯源：[`../charts/`](../charts/)（LabKey）· [`../benchling-charts/`](../benchling-charts/)（Benchling）

**用法：** 每个议题选 **恰好一个** 主选项（`- [x]`）。若选「并集/组合」，按子说明勾子项。

---

## 0. 已拍板（无需再选）

| 项 | 结论 |
| --- | --- |
| 文档位置 | `unified-charts/`；旧目录保留溯源 |
| UI 分层 | CONFIGURE + STYLE |
| Heatmap | 纳入 |
| 拟合 | 挂 Scatter + Line；Linear / Quadratic / 4PL + 套索打标 + MODEL TABLES |
| Custom code | 不纳入 |
| 表+图需求 | 同步改引用 |

---

## 1. 误差棒（Error bars）

**LabKey：** Bar/Line 等多为「聚合=Mean 时可选 SD / SEM」统计误差。  
**Benchling：** CONFIGURE **列映射**误差列；Scatter 可见竖直棒；产品侧还确认了水平误差棒。

- [ ] **1A** 仅统计型（SD / SEM，且仅 Mean 等适用聚合时）
- [ ] **1B** 仅列映射型（绑误差列；含竖直；水平仅 Scatter）
- [ ] **1C** **并集**：统计型 + 列映射型都要（CONFIGURE 提供模式切换：Statistical / From column）
- [ ] **1D** 并集，但水平误差棒 **不做**

适用范围（若选 1B/1C/1D，请再勾）：

- [ ] Bar
- [ ] Line
- [ ] Scatter
- [ ] Box（Benchling 曾确认开放；LabKey Box 无此槽）

---

## 2. 分组着色命名（Series vs Color/Shape）

**LabKey：** Scatter/Box 用 **Color**、**Shape** 两槽；Bar 用 **Group By**。  
**Benchling：** 统一 **Series**；STYLE 再调 Point Shape。

- [ ] **2A** 统一用 **Series**（颜色分组）；Shape 仅 STYLE 全局点形（不按列映射）
- [ ] **2B** 保留 LabKey：**Color 列 + Shape 列** 映射；Series 仅作 Line/Bar 别名
- [ ] **2C** **并集**：CONFIGURE 同时支持 Color 列、Shape 列；Line/Bar 的 Series 等价于 Color

---

## 3. Bar：堆叠 / 方向 / Group By

**LabKey：** Group By 分组柱；未见明确「堆叠」「水平柱」细化。  
**Benchling：** 竖直/水平 + 并排/堆叠。

- [ ] **3A** 只要 LabKey：Group By 并排分组柱（无水平、无堆叠）
- [ ] **3B** Benchling 全要：水平 + 堆叠/并排 + 聚合
- [ ] **3C** 并集：Group By/Series + 水平 + 堆叠/并排

---

## 4. Box：Jitter

**LabKey：** 已确认 **Jitter Points**。  
**Benchling：** 明确 **排除** Jitter。

- [ ] **4A** 要 Jitter（跟 LabKey）
- [ ] **4B** 不要 Jitter（跟 Benchling）

---

## 5. Line：Hide Points / 线宽

**LabKey：** Hide Data Points、Line Width、Point Size 等已确认。  
**Benchling 标准 Line：** 线宽/线型、隐藏点 **未纳入**；有 Point Shape/Opacity、对数轴。

- [ ] **5A** 要 LabKey 的 Hide Points + Line Width + Point Size（并保留对数轴）
- [ ] **5B** 只要 Benchling 标准集（点形/透明度/对数轴；无 Hide Points、无线宽）
- [ ] **5C** 并集：Hide Points + 线宽 + 点大小/形/透明度 + 对数轴

---

## 6. 拟合模型集合（挂在 Scatter + Line）

已定：要 Linear / Quadratic / 4PL + 套索打标 + MODEL TABLES。  
LabKey Trendline 另有：Point-to-Point、Polynomial、3PL/5PL（assay）等。

- [ ] **6A** **仅** Linear + Quadratic + 4PL（按你已述最小集）
- [ ] **6B** 6A + LabKey **Point-to-Point**（折线连接，不算回归）
- [ ] **6C** 6A + Polynomial（与 Quadratic 关系：Quadratic⊂Polynomial 或只保留 Quadratic）
- [ ] **6D** 6A + 3PL / 5PL（对齐 LabKey assay 非线性）
- [ ] **6E** 自定义：_______（请在回复写明）

套索打标后：

- [ ] **6F-1** 需要 **Exclude flagged from fit**（打标点仍显示为 ×，不参与拟合）
- [ ] **6F-2** 不需要 Exclude；打标仅注释/过滤用

MODEL TABLES：

- [ ] **6G-1** 要 **MODEL VARIABLES**（参数表）+ **MODEL OUTPUT**（预测/残差等）
- [ ] **6G-2** 只要 MODEL VARIABLES
- [ ] **6G-3** 只要图上拟合线 + Hover 参数，不要独立表

---

## 7. Scatter：Size / 密度 / 分面

**LabKey：** Jitter、密度分箱（Group by Density）、分面 Number of Charts、双 Y；**无**误差列、**无** Size 列（本次细化）。  
**Benchling：** Size 第三度量、水平误差棒、Jitter/分箱、双 Y；专章曾不展开 Series Color/Legend（共性另有）。

- [ ] **7A** LabKey 密度/分面 + Benchling Size + 水平误差棒（**并集**）
- [ ] **7B** 不要密度分箱（有 Heatmap 替代）；保留 Size、Jitter、双 Y、误差棒
- [ ] **7C** 不要 Size；保留 LabKey 密度/分面 + 双 Y + 误差棒决议（随 §1）

Legend / 逐系列色（Scatter）：

- [ ] **7D-1** Scatter 也要 Legend + 系列取色（跟 common）
- [ ] **7D-2** Scatter 不要独立 Legend/系列取色（跟原 Benchling 专章排除）

---

## 8. Pie：渐变与半径

**LabKey：** Inner/Outer Radii、百分比阈值、**Gradient % + Gradient Color**。  
**Benchling：** 环形半径、百分比、非 Count；无渐变细化。

- [ ] **8A** 并集：双半径 + 百分比 + 渐变 + 非 Count
- [ ] **8B** 只要环形（内径）+ 百分比 + 非 Count（不要渐变）
- [ ] **8C** 跟 LabKey 全套；非 Count 按已扩展确认保留

---

## 9. 共性外观：Title / 尺寸 / 边距 / 导出

**LabKey：** Title、Subtitle、Width、Height、Margins；导出 **PDF / PNG**。  
**Benchling：** Custom label、Legend 方位、色板、抽样提示、SPLIT；导出未作为专章重点。

- [ ] **9A** 并集：Title/Subtitle/尺寸/边距 + Legend/色板 + **PDF/PNG 导出** + 抽样提示
- [ ] **9B** 只要 Benchling 侧栏项 + Hover；导出不做
- [ ] **9C** 只要 LabKey Title/尺寸/导出；不要抽样提示 / SPLIT（SPLIT 已由表+图「图表位置」覆盖则可勾此项）

SPLIT WORKSPACE vs 表+图 `chartPosition`：

- [ ] **9D-1** 统一用表+图需求的 **上/下/左/右**；不再单独写 SPLIT
- [ ] **9D-2** 文档两者都写，语义等同

---

## 10. 配置持久化（Save）

**LabKey 细化：** 保存权限等曾排除。  
**Benchling：** Save/Cancel 提交配置（会话内）已确认。

- [ ] **10A** 要 **Save/Cancel**（至少当前分析会话内保存图配置）
- [ ] **10B** 只要 Apply 刷新，不强调持久 Save
- [ ] **10C** Save 到表+图工作区配置（与 `table-chart-integration` 一并定义）

---

## 11. View Type 切换

**LabKey：** 部分图种勾选了类型切换，Bar/Box 曾排除切换。  
**Benchling：** View Type 下拉切换已确认。

- [ ] **11A** 所有已纳入图种均可在 CONFIGURE 切换 View Type（能复用则保留映射）
- [ ] **11B** 仅创建时选类型，创建后不可切换
- [ ] **11C** 可切换，但 Heatmap ↔ 其他 不保留映射（其余可保留）

---

## 12. Heatmap 与 Scatter 密度的关系

已定纳入 Heatmap。LabKey Scatter 仍有密度 Layout。

- [ ] **12A** Heatmap 独立图种；Scatter 密度 Layout **仍保留**
- [ ] **12B** Heatmap 独立图种；Scatter **去掉**密度 Layout，引导用户用 Heatmap
- [ ] **12C** 与 §7 选项绑定：以你在 §7 的选择为准（本项可不选）

---

## 勾选完成后

请回复例如：`冲突已勾选`，或指出改过的文件路径。我将据此写齐 `common.md` 与各图种细则，并更新 `table-chart-integration.md`。
