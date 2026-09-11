# 抗体候选筛选报告结构（templateId: antibody）

对应 `templateId` / 默认 `theme`：`antibody`。写报告前：先 `read_skill(report-format-common)`，再读本 skill。**禁止**未读取时凭记忆编造结构。

## 推荐章节顺序

1. **筛选目标与数据范围** — 适应症/靶点、筛选门槛（如 KD、表达量、纯度）。
2. **数据概况** — 批次、样本量、关键列（clone_id、KD、表达量等）。
3. **关键发现与候选证据** — 动力学 / 表达量等图：每图 `caption` + 紧跟解读（点名趋势与离群候选）。
4. **候选一览**（可选 `table`）— 引用主表 `tableId`，caption 说明字段；解读段给出排序逻辑。
5. **结论**（`conclusion`）— Top N 候选与进入下一轮（如细胞构建）的理由；勿留占位。

## Section schema

允许 kind：`heading` / `paragraph` / `bullets` / `chart` / `table` / `divider`。

优先用真实分析结果中的散点/柱状等视图；Custom Code 图用 `chartId`。

## 语气

中文、产业研发评审口吻、无 emoji；用可复核的数值与 id 说话，避免「请结合…综合评估」空话。

## 篇幅上限

- 目标段 ≤ 220 字；单图解读 ≤ 400 字；候选说明 ≤ 350 字；`conclusion` ≤ 600 字。

## 必填与禁止

同 `report-format-common`：真实 `tableId`/`viewId`/`chartId`、caption+解读、禁止 `待完善` / `后续由 AI` / 脚手架「请结合…」套话、禁止 think/工具日志。

## JSON 要点

`templateId: "antibody"`。完成态须 `done: true` 且通过质量门。
