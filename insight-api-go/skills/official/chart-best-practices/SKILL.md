# Chart best practices

在 Insight Studio 中配置图表时，优先使用平台已有工具，而不是臆造字段。

## 步骤建议

1. 用 `list_tables` / `get_table_schema` 确认可用列与类型。
2. 用 `create_view` 或已有视图工具创建对应图表类型（bar / line / scatter / box / pie / heatmap）。
3. 映射字段时：分类列作 x/category，数值列作 y；分组用 series / color。
4. 图例位置跟随配置；窄屏允许收起，不要把图例硬叠在主图上。
5. 需要对照原始数据时，保持源表在图下方（图表 `position: top`）。

## 注意

- 不要编造不存在的列名。
- 大表先过滤或抽样，再做高基数分类图。
