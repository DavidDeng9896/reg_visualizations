# In vivo efficacy & tolerability

面向体内药理：药效（如瘤体积）与耐受（体重）随时间的分组比较。

## 典型数据表

| 表 | 关键列 | 用途 |
| --- | --- | --- |
| Tumor / PD readout | `animal_id`, `group`, `day`, `tumor_mm3` | 药效曲线 |
| Body weight | `animal_id`, `group`, `day`, `body_weight_g` | 耐受 |
| PK (可选) | `animal_id`, `time_h`, `conc_ug_mL` | 暴露 |

## 推荐流程

1. 确认每只动物有稳定 `animal_id`，分组列清晰（Vehicle / Dose1 / …）。
2. 药效：`line`，`x=day`，`values=tumor_mm3`，`series=group`（或先按组聚合后再图；若为个体曲线则 series=`animal_id` 并分面说明）。
3. 耐受：同样对 `body_weight_g` 作折线；标注相对 Day0 下降是否超过项目阈值（如 10%–20%，以 SOP 为准）。
4. 终点比较：过滤末次 `day`，`box`/`bar` 比较各组 `tumor_mm3`。
5. 结论结构：**药效是否分离于 Vehicle**、**耐受是否可接受**、建议的下一剂量/下一模型——并引用具体 group 名。

## 禁止

- 在样本数极少时宣称「显著」而不说明 n。
- 混淆个体曲线与组均值曲线却不说明。
