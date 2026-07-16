# 统一图表 · 冲突决议（已定稿）

> 用户已勾选；双选项按下方「裁定」生效。本文件为拍板记录，细则以各专章为准。

## 裁定摘要


| 议题     | 生效决议                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| §1     | **1A** 仅统计型误差棒（Mean 时 SD / SEM）。适用范围按勾选：**Bar / Scatter / Box**（**Line 不做**误差棒）。水平列映射误差棒不做。                                                   |
| §2     | **2B** Color 列 + Shape 列映射；**Series** 仅作 Line/Bar 分组着色别名                                                                                    |
| §3     | **3B** Bar：水平 + 堆叠/并排 + 聚合                                                                                                                    |
| §4     | **4B** Box **无** Jitter                                                                                                                      |
| §5     | **5B** Line：点形/透明度/对数轴；**无** Hide Points、**无**线宽                                                                                            |
| §6     | 双选 6A+6B → 生效 **6B**：Linear + Quadratic + 4PL + **Point-to-Point**；**6F-1** Exclude flagged；**6G-1** MODEL VARIABLES + MODEL OUTPUT（Scatter+Line） |
| §7+§12 | 双选 7A+7B + **12B** → **无** Scatter 密度 Layout（改用 Heatmap）；保留 **Size、Jitter、双 Y、分面**；误差棒随 §1；**7D-1** Legend + 系列取色                           |
| §8     | **8B** 环形内径 + 百分比 + 非 Count；**无**渐变                                                                                                           |
| §9     | **9A** Title/尺寸/边距/Legend/色板/PDF·PNG/抽样提示；**9D-1** 布局用表+图 `chartPosition`，不单写 SPLIT                                                          |
| §10    | **10C** Save 进表+图工作区配置                                                                                                                        |
| §11    | **11A** 全部图种可切换 View Type（可复用则保留映射）                                                                                                           |


---

以下为原始勾选清单（归档）。

# 统一图表 · 冲突 / 待决勾选清单（归档）

> 设计说明：[docs/specs/2026-07-16-unified-charts-merge-design.md](../../specs/2026-07-16-unified-charts-merge-design.md)

## 0. 已拍板

| 项 | 结论 |
| --- | --- |
| 文档位置 | `docs/features/charts/`；旧目录见 `docs/archive/` |
| UI 分层 | CONFIGURE + STYLE |
| Heatmap | 纳入 |
| 拟合 | 挂 Scatter + Line；Linear / Quadratic / 4PL + 套索打标 + MODEL TABLES |
| Custom code | 不纳入 |
| 表+图需求 | 同步改引用 |

## 1–12 勾选原文

见 git 历史本文件用户勾选版本；生效解释以文首「裁定摘要」为准。
