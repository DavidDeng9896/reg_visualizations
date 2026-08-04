# Lab data workflow

通用实验室数据分析节奏（抗体 / 细胞 / 体内外均可套用）。

## 标准步骤

1. **探查**：`list_tables` → `get_table_schema`（看类型与样例行）。
2. **计划**：`submit_plan` 写清「清洗 → 连接/派生 → 作图 → 结论」。
3. **清洗**：`add_filter_step` 去空白/对照/失败孔；`add_hide_columns_step` 去掉无关列。
4. **整合**：多表用 `add_join_step`（键如 `clone_id`/`animal_id`）或 `add_union_step`。
5. **派生**：`add_computed_column_step`（如相对 Day0 体重变化、效价比）。
6. **可视化**：`create_view` + `set_chart_config`；映射前再次确认字段存在。
7. **交付**：中文总结 + 产物名称；需要细则时 `read_skill` 对应领域 Skill。

## 领域 Skill 路由

- 抗体筛选 / 动力学 → `antibody-discovery`
- 细胞株 / 滴度 → `cell-line-development`
- 孔板 / 4PL → `in-vitro-bioassay`
- 瘤体积 / 体重 → `in-vivo-efficacy`
- 图表排版 → `chart-best-practices`
