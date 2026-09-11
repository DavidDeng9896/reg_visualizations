# 数据复盘报告结构（templateId: dashboard-review）

对应 `templateId` / 默认 `theme`：`dashboard-review`。写报告前：先 `read_skill(report-format-common)`，再读本 skill。**禁止**未读取时凭记忆编造结构。

## 推荐章节顺序

1. **复盘范围** — 时间窗/业务范围、纳入的分析与视图。
2. **指标与视图一览** — `bullets` 列出关键 KPI / 视图名称与含义。
3. **视图解读** — 逐个 `chart`/`table`：`caption` + 紧跟解读（异常点、趋势拐点、分组差异）。
4. **行动项结论**（`conclusion`）— 2–5 条可执行行动（可含建议负责人/优先级），禁止「待完善」。

## Section schema

允许 kind：`heading` / `paragraph` / `bullets` / `chart` / `table` / `divider`。

KPI 可用 `bignumber` 视图的 chart 节；解读要写清「看到了什么 → 意味着什么 → 建议做什么」。

## 语气

中文、业务复盘口吻、无 emoji；短句、可执行，避免过程独白与工具日志。

## 篇幅上限

- 范围段 ≤ 180 字；单图解读 ≤ 350 字；`conclusion`（含行动项）≤ 600 字。

## 必填与禁止

同 `report-format-common`：真实 `tableId`/`viewId`/`chartId`、caption+解读、禁止占位套话与 think/工具日志泄漏。

## JSON 要点

`templateId: "dashboard-review"`。宣称完成时传 `done: true`。
