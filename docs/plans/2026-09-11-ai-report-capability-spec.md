# AI Report Capability Spec

**日期：** 2026-09-11  
**仓库：** `DavidDeng9896/reg_visualizations`  
**类型：** 产品 / 工程规格（**仅文档**；本 PR 不含功能代码）  
**状态：** David 已锁定三项（见 §Product rules）；待 Voss 切片实现、Aegis 验收  

**已核对 main 现状（勿发明）：**

| 能力 | 现状路径 | 行为摘要 |
| --- | --- | --- |
| 创建/更新报告工具 | `insight-studio/src/modules/ai/tools/registry.ts`、`tools/impl.ts`（`create_report_step` / `update_report_step`） | 流程图独立 `report` 节点；无 `wantReport` 门禁 |
| 主会话勾选 | `insight-studio/src/modules/ai/aiStore.ts`（`wantReport`，默认 `false`）+ `AiInputBar.vue`（「完成后生成报告」） | 勾选后注入 system 提示；**发送后不自动清**；`newConversation` / `selectConversation` **亦不重置** → 跨会话粘性 |
| 模板脚手架 | `insight-studio/src/modules/steps/report/reportTemplates.ts` | `templateId`: `research` \| `antibody` \| `dashboard-review`；骨架文案含「后续可由 AI 改写」类占位 |
| 主题类型 | `insight-studio/src/shared/types.ts`（`AnalysisReport.theme`） | 目前字面量仅 `'research'`；脚手架写死 `theme: 'research'`（`reportTemplates.ts` / `reportModel.ts`） |
| 节点 AI 写报告 | `insight-studio/src/modules/steps/panel/ReportAiAssist.vue` | **单轮** `postChat` + SSE，无工具循环 |
| Custom Code AI | `insight-studio/src/modules/ai/codeAiStore.ts` + `agentLoop.ts` | 多轮 agent-loop；工具含 `list_skills` / `read_skill` / `save_memory` / `run_python_code` |
| Skills 平台 | `insight-studio/src/modules/ai/client.ts`（`aiSkillsApi`）；工具 `list_skills` / `read_skill`；官方例 `insight-api-go/skills/official/statlib-*/` | Skill = `skill.json` + `SKILL.md`；主会话 / code 场景均可读 |
| 报告面板 | `ReportPanel.vue` → `ReportPreview` / `ReportEditor` / `ReportAiAssist` | 预览/编辑 + 悬浮 AI 小窗 |
| Prompt 现状冲突点 | `insight-studio/src/modules/ai/prompts.ts` | 写「用户勾选或**口头要求**时必须创建报告」→ 与 David 锁定冲突，须改 |

---

## Goal / non-goals

### Goal

1. **门禁**：仅当用户显式开启「生成报告」（会话级 `wantReport`）时，主会话 agent 才允许调用 `create_report_step`；口头要报告须先 `ask_user` / 确认并勾选，**禁止**在未勾选时直接建报告节点。  
2. **内容 vs 视觉分离**：报告 **CONTENT/结构** 由 Skills（`SKILL.md`）定义；**VISUAL 风格**挂在报告节点 / `AnalysisReport`（theme），由 Lumen 渲染，不只是输入条皮肤。  
3. **节点级 AI 写报告** 对齐 Custom Code 的 agent-loop（`reportAiStore` 类比 `codeAiStore`），且可调用现有 Skills 工具；写完直接 `update_report_step` 落到本节点，不另造流程图节点。  
4. **质量**：真实 `tableId`/`viewId`/`chartId`；AI 宣称完成时不得残留脚手架占位；可测验收给 Aegis。

### Non-goals

- 本规格 **不实现** 功能代码（仅计划 / 契约）。  
- 不重写主会话 ReAct 到后端；不合并主会话与节点 AI 历史。  
- 不为报告场景开放全套分析工具（建表/删表/出图流水线）；节点 AI 白名单见 §Node AI write。  
- 不在本规格内设计全新报告编辑器 UI 大改；Lumen 主题实现可并行切片，但契约先定。  
- 不强制迁移已有报告 JSON 到新 theme 枚举以外的破坏性 schema（见 §Migration）。

---

## Product rules (David locks)

> Locked 2026-09-11 by David.

1. **Checkbox「生成报告」** 在 AI 输入条；**默认未勾选**。未勾选时 **HARD FORBID** `create_report_step`。用户口头要报告 → agent 必须 `ask_user`（或等价确认），用户确认后 **勾选** 再允许创建；不得仅靠 prompt「口头也要建」。  
2. **报告 CONTENT/结构格式走 Skills**；**VISUAL 风格挂在报告节点**（`report` JSON / step config 的 theme），不是只改输入条外观。  
3. **节点级 AI 写报告** 必须对齐 Custom Code 的 agent-loop，**并且可以调用 Skills**（`list_skills` / `read_skill` 等现有工具，见白名单）。

### Sticky 决策（本规格锁定推荐）

| 场景 | 行为 |
| --- | --- |
| 新会话 / 切到另一会话 | `wantReport = false`（默认关） |
| 同一会话内多次发送 | **保持勾选**直到用户手动取消（chip × 或菜单再点） |
| 发送成功后 | **不**因 send 自动清空勾选 |
| 口头确认后 | UI 将 `wantReport` 置 `true`（并可选弹出模板选择）后再续跑 / 下一轮允许 `create_report_step` |

**相对现状：** 今日 `wantReport` 在 `newConversation`/`selectConversation` 不重置（跨会话粘性）→ 实现时改为 **按会话语义重置**，与上表一致。

---

## When to create (gate matrix)

会话级标志：`wantReport === true`（来自输入条勾选，或口头确认后 UI 写入）。

| 用户状态 | 口头要报告？ | 允许的报告相关工具 | Agent 应有行为 |
| --- | --- | --- | --- |
| `wantReport=false` | 否 | **禁止** `create_report_step`；允许 `update_report_step`（仅当用户点名已有报告节点且上下文明确） | 正常分析；不得新建报告节点 |
| `wantReport=false` | 是 | **禁止** `create_report_step` 直至勾选 | 调用 `ask_user`（选项含「勾选并生成报告」）；确认后由 UI 设 `wantReport=true`，必要时带上 `templateId`；再继续 |
| `wantReport=true` | 任意 | 允许 `create_report_step`（须带/可解析 `templateId`）+ `update_report_step` | 分析落地后创建/更新报告；先 `read_skill` 对应 format skill（见 §Skill contract） |
| 节点 AI（报告面板） | N/A | **仅** `update_report_step`（本 `stepId`）+ schema/skills 白名单；**禁止** `create_report_step` | 改写当前节点；empty→draft→done |

**说明：**

- 「口头」判定：用户自然语言表达要「报告 / 分析报告 / 写一份报告」等；实现可用既有 `intentHint` / prompt + 工具门禁兜底，**门禁优先于意图猜测**。  
- `ask_user` 已存在于 `agentLoop.ts`；危险确认同构通道可复用交互模式，但产品路径以 **勾选 `wantReport`** 为唯一创建许可。  
- Worker 白名单今日含报告工具（`tools/workers.ts` 分析师 allow 列表）→ 子 agent 同样必须读到同一 `wantReport` 会话标志，或从主会话剥夺 `create_report_step` 直至标志为真。

---

## Hard enforcement points (prompt alone insufficient)

仅改 `prompts.ts` **不够**。必须在工具执行层硬拒：

1. **Tool-layer reject**（主路径）：`tools/impl.ts` 的 `create_report_step`（及任何包装/worker 转发）在调用前检查会话 `wantReport`（或显式传入的 run 上下文 `ctx.wantReport`）。  
   - `wantReport !== true` → **立即 `fail(...)`**，不 mutate flowchart。  
   - 错误文案须 **对模型可读、可行动**，例如：  
     `FORBIDDEN: create_report_step 需要用户勾选「生成报告」(wantReport)。请 ask_user 确认；用户勾选后再调用。`  
2. **Registry / 描述同步**：`registry.ts` 中 `create_report_step` description 注明须 `wantReport`；避免模型误以为口头即可。  
3. **Prompt 纠偏**：删除/改写 `prompts.ts` 中「口头要求时必须创建」为「口头 → ask_user → 勾选后才可 create」。`aiStore.ts` 仅在 `wantReport` 时注入「必须 create」块（现状已有注入，保留并加强 templateId）。  
4. **Worker / 子循环**：`tools/workers.ts` 若仍放行 `create_report_step`，子循环 `exec` 必须共享同一门禁（同一 `ctx`），禁止旁路。  
5. **节点 AI**：`reportAiStore` **不注册** `create_report_step`，从白名单物理排除。  
6. **测试（Aegis / unit）**：`wantReport=false` 时直接 `execTool('create_report_step', …)` 必失败；`true` 时成功。不依赖模型是否听话。

---

## Skill contract for report content

### 职责切分

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| **Skill（内容）** | 章节 schema、语气、篇幅上限、必填 caption+解读、禁止 think/日志/占位套话 | 颜色、字体、页边距、封面皮肤 |
| **节点 theme（视觉）** | Lumen 主题 tokens / CSS / 打印样式 | 章节逻辑与科学表述细则 |
| **`templateId`** | 选用哪份内容 skill + 默认主题映射 | 替代 Skill 全文 |

### 建议 Skill ids / names（与 `statlib-*` 并列的官方 skill）

落地目录建议：`insight-api-go/skills/official/report-format-*/`（`skill.json` + `SKILL.md`），经现有 `/api/ai/skills` 安装。

| skill id（提案） | name | 对应 `templateId` |
| --- | --- | --- |
| `report-format-research` | 科研通用报告结构 | `research` |
| `report-format-antibody` | 抗体候选筛选报告结构 | `antibody` |
| `report-format-dashboard-review` | 数据复盘报告结构 | `dashboard-review` |

可选聚合 skill：`report-format-common`（三模板共享的硬性质量条：真实 id、禁止占位、caption 规则）；若引入，agent 先读 common 再读具体 template skill。

### Skill body（`SKILL.md`）必须定义

1. **Section schema**：允许的 `kind`（与 `ReportSectionKind` 对齐：`heading`/`paragraph`/`bullets`/`chart`/`table`/`divider`）；推荐章节顺序（目标 → 数据概况 → 关键发现 → 结论）。  
2. **Tone**：中文、专业、无 emoji；禁止模型 think 标签泄漏进正文。  
3. **Length caps**：例如单段解读上限、conclusion 上限（具体数字写入 skill，避免代码魔法数分叉）。  
4. **Required**：每个 `chart`/`table` 节必须有 **非空 caption**，且紧跟 **解读 paragraph**（引用趋势/离群/分组等，基于真实数据语境）。  
5. **Forbid**：`待完善`、`后续由 AI 改写`、`请结合…综合评估` 等脚手架套话；禁止把 `<think>`/工具日志/原始 tool JSON 写入报告。  
6. **Id 绑定**：`tableId`/`viewId`/`chartId` 必须来自当前分析（经 `get_table_schema` / 上下文），禁止虚构。

### Agent 如何加载 Skill

1. 主会话：`wantReport=true` 且即将写报告前 → `list_skills`（若目录未注入）→ **`read_skill(report-format-<template>)`**（及 optional common）。  
2. 节点 AI：`reportAiStore` 在首轮 system 注入 skills catalog（同 `buildSkillsCatalogPrompt`），写/改前同样 `read_skill`。  
3. **禁止**在未 `read_skill` 时凭记忆编造该模板的特殊结构（与主会话「配图不要乱读 skill」相反：**写报告必须读 format skill**）。  
4. 脚手架 `scaffoldReportFromAnalysis`（`reportTemplates.ts`）仍可用于 **empty→draft** 初稿，但 AI **宣称 done 前**须用 skill 规则洗掉占位（见 §Content quality gates）。

---

## Node visual styles

### 三主题 ↔ `templateId`

| `templateId` | 建议 `theme` 字段值 | 视觉方向（Lumen） |
| --- | --- | --- |
| `research` | `research` | 科研论文风：衬线标题、冷静分隔、图注编号 |
| `antibody` | `antibody` | 候选筛选风：强调表格/候选清单层级、证据图注 |
| `dashboard-review` | `dashboard-review` | 复盘看板风：指标感更强、行动项列表视觉权重高 |

### 契约

- **存储**：`AnalysisReport.theme` + `templateId` 写入 `step.config.report`（`create_report_step` / `update_report_step` / 节点 AI apply）。  
- **扩展类型**：`insight-studio/src/shared/types.ts` 将 `theme: 'research'` 扩为与三模板对齐的联合类型（或 `ReportThemeId`）；缺省回退 `research` 以兼容旧数据。  
- **所有权**：Lumen（设计/前端视觉）拥有 `ReportPreview`（及导出 HTML）主题 CSS/tokens；内容作者（Skill/AI）只设 `theme`/`templateId`，不内联颜色。  
- **非目标**：输入条 checkbox / 模板缩略图只是 **选择器**；真正皮肤在 **报告节点预览**。

### 输入条模板选择 → 创建参数

勾选后展示 **3 个模板缩略图**（`REPORT_TEMPLATES` 元数据：`reportTemplates.ts`）；选中的 `templateId`：

- 写入会话态（如 `aiStore.reportTemplateId`，默认 `research`）；  
- 传入 `create_report_step({ templateId })`；  
- 并映射默认 `theme`（上表）。

---

## Input bar UX

**现状：** `AiInputBar.vue` 在「+」菜单内「完成后生成报告」；勾选后 chip「生成报告」；**无**模板 picker。

**目标：**

1. Checkbox / 菜单项文案可收敛为「生成报告」（与 chip 一致）；**默认 off**。  
2. **勾选后**展开/弹出 **模板 picker**（3 thumbs：科研通用 / 抗体筛选 / 数据复盘）；未选时默认 `research`。  
3. `templateId` 进入 `create_report_step` 参数与 wantReport system 提示。  
4. 取消勾选 → 收起 picker；清除「本会话要建报告」许可（`wantReport=false`）。  
5. Sticky：见 §Product rules；**新会话默认 off**。

---

## Node AI write

### 问题

`ReportAiAssist.vue` 单轮聊天；Custom Code 已用 `codeAiStore` + `runAgent` 多轮工具。报告节点必须达到同等可靠度，并能读 Skills。

### 方案：`reportAiStore`（命名提案）

类比 `insight-studio/src/modules/ai/codeAiStore.ts`：

- 复用 `agentLoop.runAgent`、`makeOnEvent`、会话按 `(analysisId, stepId)` 挂载（`conversationScope.ts` / `pickStepConversation`）。  
- **不**拆改主 `aiStore` 主路径（与 Custom Code 设计一致：`docs/superpowers/specs/2026-08-25-custom-code-ai-agent-loop-design.md`）。

### Tools whitelist（节点 AI）

| 工具 | 用途 |
| --- | --- |
| `update_report_step` | 唯一写入途径；`stepId` 锁定当前报告节点 |
| `get_table_schema` | 绑定真实字段/表 |
| `list_skills` | 发现 format skills |
| `read_skill` | 加载 `report-format-*` 正文 |

**可选（若主注册表已有且无害）：** `list_tables`（只读探路）。  

**禁止：** `create_report_step`、删表/清空、建图流水线、`run_python_code`（除非后续单列需求）、delegate_* worker（默认禁止，防跑偏）。

> 注：今日工具名是 `list_skills` / `read_skill`（**无**独立 `run_skill`）。规格要求 **匹配现有 skill 工具**；不要发明新的 `run_skill`，除非平台先增加该 API。

### Apply 语义

- 工具成功 → 报告 JSON 已在 step config；UI 预览刷新。  
- **不**新建额外 flowchart 节点。  
- 状态机：**empty**（空/`emptyReport`）→ **draft**（脚手架或未通过质量门）→ **done**（通过 §Content quality gates）。  
- Agent 在 draft 可多轮 `update_report_step`；宣称完成前自检占位与 id。

### UI

- `ReportPanel.vue` 浮窗改为驱动 `reportAiStore`（替换/渐进替换 `ReportAiAssist` 单轮）；交互对齐 `CustomCodeAiChat.vue`（多轮、续跑、trace）。

---

## Content quality gates

在 `update_report_step` / 节点 AI 收束 /（可选）主会话 create 之后校验：

1. **真实引用**：每个 `chart`/`table` section 的 `tableId`+`viewId` 或 `chartId` 必须在当前 `Analysis` 可解析；否则 fail 并让模型修正。  
2. **Caption + 解读**：有图/表则必须有非空 `caption`，且后续存在解读性 `paragraph`（允许同轮多 section）。  
3. **占位扫描**：若正文匹配禁止列表（如 `待完善`、`后续由 AI`、`请结合` 脚手架句式、空 conclusion），且模型已标记完成 / 用户点「完成」→ **拒绝 done**，返回明确错误。  
4. **Think/日志**：剥离或拒绝含 `<think>`、大量 tool trace 粘贴的 body。  
5. **主会话 create**：允许先 scaffold 成 draft；同一轮或紧随 `update_report_step` 洗到 done；若仅 scaffold 且 agent 说「已完成」→ 测试判失败。

实现位置建议：共享 `reportQuality.ts`（名称提案），供 `impl.ts` 与 `reportAiStore` 复用。

---

## Migration / backward compat

| 项目 | 策略 |
| --- | --- |
| 已有 `report` 步骤 | 继续可预览/编辑；缺 `theme` → 视为 `research`；缺 `templateId` → `research` |
| 旧会话 `wantReport` 粘性 | 实现重置逻辑后，老用户可能感到「新会话要重新勾选」——符合产品默认 off |
| `AnalysisReport.theme` 类型扩展 | 旧 JSON `"theme":"research"` 合法；新主题仅新写入 |
| `ReportAiAssist` | 可先双轨：feature flag 切到 `reportAiStore`；稳定后删单轮路径 |
| Skills 未安装 | agent 仍可读内置 prompt 降级，但 Aegis 验收环境须预装三份 `report-format-*` |
| Worker / e2e | 更新 `tests/unit/ai/impl.spec.ts`、`ports.spec.ts`、`e2e/ai.spec.ts` 中与报告相关的假定 |

---

## Acceptance criteria for Aegis（可测）

- [ ] **AC1** 新会话打开时「生成报告」未勾选；`wantReport === false`。  
- [ ] **AC2** `wantReport=false` 时，单元/集成直接调用 `create_report_step` → **失败**，错误信息含需勾选 / `wantReport`；flowchart **无**新 report 节点。  
- [ ] **AC3** 勾选后选择 `antibody`（或另两模板），分析任务完成后存在 report 节点，且 `config.report.templateId` / `theme` 映射正确。  
- [ ] **AC4** 用户口头「写一份分析报告」且未勾选 → 出现 `ask_user`（或确认 UI）；在确认勾选前 **零** `create_report_step` 成功。  
- [ ] **AC5** 同一会话勾选后连续两轮发送，`wantReport` 仍为 true；新开会话后为 false。  
- [ ] **AC6** 写报告路径有 `read_skill` 指向 `report-format-*`（trace 可见）或等价强制注入 skill 正文。  
- [ ] **AC7** 报告预览随 `theme` 变化（三主题视觉可区分；Lumen 验收截图）。  
- [ ] **AC8** 节点 AI：多轮工具调用；仅 `update_report_step` 写当前节点；无额外 report 节点。  
- [ ] **AC9** 节点 AI 可 `list_skills` + `read_skill`；可根据 skill 改结构。  
- [ ] **AC10** 完成态报告：无 `待完善` 等占位；图/表 id 可解析；缺 caption/解读则不能算 done。  
- [ ] **AC11** 旧报告节点（仅 `theme: research`）仍能打开预览。  
- [ ] **AC12** MiniMax（或项目指定验收模型）主路径：勾选 + 简单分析 → 独立报告节点，正文非聊天长文替代（回归 `prompts` 要求）。

---

## Suggested PR slices for Voss（顺序）

1. **Gate + prompt 纠偏**  
   - `impl.ts` / worker ctx：`wantReport` 硬拒；`prompts.ts` / `aiStore` 文案；unit tests。  
   - 验收：AC2、AC4（工具层部分）。

2. **wantReport 会话语义 + 输入条模板 picker**  
   - `aiStore` 重置策略；`AiInputBar` checkbox + 3 thumbs；`reportTemplateId` 传入 create。  
   - 验收：AC1、AC3、AC5。

3. **Skill 包 + 主会话读 skill 写报告**  
   - 官方 `report-format-*`；create/update 前 read_skill；质量门 `reportQuality` 初版。  
   - 验收：AC6、AC10、AC12。

4. **Theme 类型 + Lumen 三主题挂节点**  
   - `types.ts` / `reportModel`；`ReportPreview` 主题；scaffold 写入映射。  
   - 验收：AC7、AC11。

5. **`reportAiStore` agent-loop**  
   - 对齐 `codeAiStore`；白名单工具；`ReportPanel` 接线；empty→draft→done。  
   - 验收：AC8、AC9、AC10。

6. **Aegis 矩阵与 e2e 加固**  
   - 扩展 `docs/dev/ai-agent-lifecycle-test/` 或 studio unit/e2e；口头门禁 + 主题截图清单。  
   - 验收：全 AC 清单勾完。

---

## Open questions（仅不可化约项）

1. **口头确认 UX：** `ask_user` 选项点选后，是否由 **前端**在 resolve 时直接 `wantReport=true`，还是模型再发一轮依赖用户手动勾选？→ 建议前端在肯定选项 resolve 时自动勾选并带默认/上次 `templateId`，减少摩擦（仍满足「先确认再 create」）。  
2. **`update_report_step` 在 `wantReport=false` 时：** 主会话是否允许改已有报告？→ 本规格建议 **允许**（避免无法修报告），仅锁 **create**。若产品要「完全静默报告」，需 David 再锁。  
3. **Lumen 主题交付物格式：** CSS 变量挂在 `ReportPreview` vs 独立 theme pack 包名——交 Lumen 定，不影响内容 skill 契约。

---

## 关键文件索引（实现时优先打开）

```
insight-studio/src/modules/ai/aiStore.ts
insight-studio/src/modules/ai/AiInputBar.vue
insight-studio/src/modules/ai/prompts.ts
insight-studio/src/modules/ai/tools/registry.ts
insight-studio/src/modules/ai/tools/impl.ts
insight-studio/src/modules/ai/tools/workers.ts
insight-studio/src/modules/ai/codeAiStore.ts          # 节点 AI 范式
insight-studio/src/modules/ai/agentLoop.ts
insight-studio/src/modules/ai/client.ts               # aiSkillsApi
insight-studio/src/modules/steps/report/reportTemplates.ts
insight-studio/src/modules/steps/report/reportModel.ts
insight-studio/src/modules/steps/panel/ReportAiAssist.vue
insight-studio/src/modules/steps/panel/ReportPanel.vue
insight-studio/src/shared/types.ts                    # AnalysisReport
insight-api-go/skills/official/                       # 新 report-format-* 并列处
docs/superpowers/specs/2026-08-25-custom-code-ai-agent-loop-design.md
```
