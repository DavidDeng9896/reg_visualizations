# 分析报告内容质量通则

写/改 `report` 节点正文前，先读本 skill，再读对应模板 skill（`report-format-research` / `report-format-antibody` / `report-format-dashboard-review`）。**禁止**未 `read_skill` 凭记忆编造模板结构。

本 skill **只定义内容质量**，不含颜色/字体/页边距等视觉（视觉由节点 `theme` 渲染）。

## 允许的 section.kind

与 `ReportSectionKind` 对齐，仅允许：

- `heading` — 章节标题
- `paragraph` — 正文段落
- `bullets` — 列表
- `chart` — 引用分析中的图（原生：`tableId`+`viewId`；Custom Code Figure：`chartId`）
- `table` — 引用分析中的表（`tableId`）
- `divider` — 分隔

## 语气与篇幅

- 中文、专业、克制；**禁止 emoji** 与装饰性符号。
- 禁止把模型 `<think>` / tool 日志 / 原始 tool JSON 写入报告任何字段。
- 单段解读 `paragraph.body` 建议 ≤ 400 字；`conclusion` 建议 ≤ 600 字。超长请拆段，勿堆砌过程旁白。

## 必填：caption + 解读

每个 `chart` / `table` 节必须：

1. 有**非空** `caption`（图注/表注，说明对象与度量）。
2. **紧跟**一个非空 `paragraph` 解读（可隔 `divider`，但不可直接跳到下一个 chart/table/heading）。
3. 解读须基于真实数据语境（趋势、离群、分组差异、阈值等），禁止空泛套话。

## 禁止占位套话

正文（含 title / subtitle / caption / body / items / conclusion）不得出现：

- `待完善`
- `后续由 AI` / `后续由 AI 改写`
- `请结合…综合评估` 类脚手架句
- `尚未生成内容` 等空壳提示

脚手架 `scaffoldReportFromAnalysis` 仅用于 **empty→draft**；宣称 **done** 前必须洗掉上述占位。

## Id 绑定（禁止虚构）

- 原生图：`tableId` + `viewId` 必须来自当前分析（`list_tables` / `get_table_schema` / 上下文已有 id）。
- Custom Code Figure：使用真实 `chartId`（形如 `stepId::IOData.name`）。
- 表节：`tableId` 必须可解析。
- **禁止**编造 id；解析失败则先查 schema / 列表，再写报告。

## 完成态（done）

仅当：无占位、无 think 泄漏、每个图/表有 caption+解读、全部 id 可解析、conclusion 非空，才可在 `update_report_step`（或 create）上传入 `done: true`。
