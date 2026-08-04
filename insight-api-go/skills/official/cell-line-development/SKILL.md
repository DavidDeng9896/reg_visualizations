# Cell line development

面向细胞构建 / CLD 科学家：跟踪转染池与单克隆的表达与健康度。

## 典型数据表

| 表 | 关键列 | 用途 |
| --- | --- | --- |
| Fed-batch titer | `clone_id`, `day`, `titer_mg_L`, `viability_pct`, `VCD_e6` | 培养过程 |
| Clone screen | `clone_id`, `pool`, `titer_day14`, `qP`, `doubling_h` | 克隆排序 |
| Stability | `clone_id`, `passage`, `titer_mg_L`, `glycan_flag` | 传代稳定性 |

## 推荐流程

1. 确认 schema 后，用 `line`：`x=day`，`values=titer_mg_L`（可再加 `viability_pct`），`series=clone_id` 或 `pool`。
2. 克隆筛选：`bar`/`box` 比较 `titer_day14`；过滤活率过低克隆（`add_filter_step`）。
3. 生产力：`scatter` 用 `VCD_e6` vs `titer_mg_L`，或 `qP` vs `titer_day14`。
4. 稳定性：按 `passage` 折线；标记掉滴或糖型异常的代数。
5. 输出：**推荐进入放大的 Top clones**、关键培养日滴度、活率是否可接受。

## 注意

- 不同培养基/规模不可直接横比滴度，作图时用 `series` 分开。
- 缺 `day` 连续采样时先说明数据缺口，再做结论。
