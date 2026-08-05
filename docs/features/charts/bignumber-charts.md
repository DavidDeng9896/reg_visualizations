# Big number（大号数字 / 指标卡）

用于展示关键 KPI 或阶段计数（如「开发中 / 评估中 / CRO 测试」），同一组件可并排显示多个大号数字。

## CONFIGURE

| 槽位 | 必填 | 说明 |
| --- | --- | --- |
| Metrics（`values[]`） | 与 Categories 二选一 | 多度量；每个字段/聚合 → 一个数字（宽表） |
| Categories | 与 Metrics 二选一 | 类别列；每个唯一值 → 一个数字（长表） |
| Measure | 否 | Categories 模式下的度量；缺省为 Count |

优先使用 Metrics；同时配置时以 Metrics 为准。

## STYLE

| 项 | 默认 | 说明 |
| --- | --- | --- |
| Layout | row | `row` 横排；`grid` 多行多列 |
| Value font size | 42 | 数字字号 |
| Label font size | 13 | 标签字号 |
| Show label | true | 是否显示指标名 |
| Compact | false | SI 缩写（如 1.2k） |

无坐标轴与参考线。可用 Series colors 覆盖各指标数字颜色。
