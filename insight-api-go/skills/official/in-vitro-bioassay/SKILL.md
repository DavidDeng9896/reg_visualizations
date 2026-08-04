# In vitro bioassay

面向体外药效 / 生物分析：孔板剂量反应、效价相对比较与热图质控。

## 典型数据表

| 表 | 关键列 | 用途 |
| --- | --- | --- |
| Dose-response | `concentration`, `response`, `group`/`sample` | 曲线与 4PL |
| Plate map | `well`, `plate_row`, `plate_col`, `response` | 热图与边缘效应 |
| Potency | `sample`, `EC50`, `hill`, `relative_potency` | 批间比较 |

## 推荐流程

1. `get_table_schema` 后，对剂量反应用 **scatter 或 line**：`x=concentration`，`values=response`，`series=group`。
2. 拟合：在 `set_chart_config` 中设 `regression.model: "4PL"`（或平台支持的等效项），用于估计 EC50/IC50 形态。
3. 孔板质控：`heatmap`，`x=plate_col`，`y=plate_row`，`color=response`；检查边缘孔/整列异常。
4. 对照孔（如 DMSO）单独过滤或分 series，避免把对照当剂量点拟合。
5. 多样品：先 filter 出待比样品，再同图 series 比较；总结相对效价方向（更强/更弱），数值以图与表为准。

## 注意

- 浓度建议用实际数值列；若仅有稀释倍数，先说明假设。
- 热图与曲线是两个目的：质控 vs 药效参数，不要混在一次含糊结论里。
