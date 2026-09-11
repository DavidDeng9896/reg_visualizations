# 科研通用报告结构（templateId: research）

对应 `templateId` / 默认 `theme`：`research`。写报告前：先 `read_skill(report-format-common)`，再读本 skill。**禁止**未读取时凭记忆编造结构。

## 推荐章节顺序

1. **分析目标与数据范围**（`heading` + `paragraph`）— 研究问题、纳入数据、排除说明。
2. **数据概况**（`heading` + `bullets`）— 表名、行列规模、关键字段。
3. **关键发现**（`heading`）— 每个发现一对 `chart|table` + 紧跟解读 `paragraph`。
4. **结论**（写入 `conclusion` 字段，勿只放在聊天里）— 主要发现、局限、下一步。

可用 `divider` 分隔大块；不要插入与数据无关的寒暄。

## Section schema

允许 kind：`heading` / `paragraph` / `bullets` / `chart` / `table` / `divider`（见 common）。

- `chart`：原生图用 `tableId`+`viewId`；Python 图用 `chartId`；必填 `caption`。
- `table`：必填 `tableId` + `caption`。
- 每个图/表后紧跟解读 `paragraph`（标题可用「图 N 解读」）。

## 语气

中文、学术陈述口吻、无 emoji；客观描述模式与证据，避免营销腔与过程独白。

## 篇幅上限

- 目标段 ≤ 200 字；单图解读 ≤ 400 字；`conclusion` ≤ 600 字（约 3–5 句为主，可附简短局限）。

## 必填与禁止

同 `report-format-common`：真实 id、caption+解读、禁止 `待完善` / `后续由 AI` / `请结合…综合评估`、禁止 think/工具日志。

## JSON 要点

`title`、`subtitle?`、`templateId: "research"`、`sections[]`、`conclusion`。宣称完成时 `update_report_step({ done: true, report })`。
