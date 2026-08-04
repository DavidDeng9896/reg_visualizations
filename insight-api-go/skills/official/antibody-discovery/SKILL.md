# Antibody discovery analysis

面向抗体发现科学家：从初筛到动力学确认，用平台工具完成可复现分析。

## 典型数据表

| 表 | 关键列 | 用途 |
| --- | --- | --- |
| ELISA / binding screen | `clone_id`, `od450`, `isotype`, `campaign` | 初筛命中 |
| SPR / BLI kinetics | `clone_id`, `ka`, `kd`, `KD_nM`, `Rmax`, `chi2` | 亲和力与质量 |
| Developability | `clone_id`, `agg_pct`, `Tm_C`, `expression_mg_L` | 可开发性 |

## 推荐流程

1. `list_tables` / `get_table_schema` 确认字段，不要臆造列名。
2. 初筛：对 ELISA 用 `bar`/`box` 看 `od450` 分布；必要时 `add_filter_step` 去掉对照孔或低信号。
3. 与动力学表按 `clone_id` `add_join_step`（left/inner），得到「命中 + KD」宽表。
4. 候选排序视图：`scatter` 以 `KD_nM` 为 x、`expression_mg_L` 或 `od450` 为 y；系列用 `isotype`/`campaign`。
5. 动力学质量：过滤 `chi2` 过高或 `Rmax` 异常的曲线后再作图。
6. 总结时给出 **Top N clone_id**、KD 区间、以及建议进入细胞构建的理由（表达/亲和力平衡）。

## 判定经验（可调整，需结合项目 SOP）

- 初筛 hit：通常 OD 明显高于阴性对照 + 试剂空白。
- 亲和力：治疗性 mAb 常见目标常在亚纳摩至低纳摩；以项目阈值阈值为准。
- 不要只看 KD：结合 `ka/kd`、表达量与聚集风险。

## 禁止

- 编造未在表中出现的 clone 或数值。
- 在未 `get_table_schema` 前硬套映射。
