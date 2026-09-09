# AI 分析能力升级：失败链调查与可执行升级计划

**日期：** 2026-09-08  
**分支：** `feat/ai-analysis-capability-upgrade`  
**范围：** 调查 + **已落地首批代码修复**（见同目录 `ai-analysis-upgrade.md` 与 PR）。  
**仓库：** `DavidDeng9896/reg_visualizations`（Insight Studio）  
**对照样例源：** 兄弟仓 `DavidDeng9896/data_entry_ai` + 本仓已有 `docs/dev/ai-agent-lifecycle-test/`

> **实现状态（2026-09-08）：** Intent 启发式注入、`tableSchema` 富字段摘要、原子 `create_chart`、校验后写入 `set_chart_config`、`AiChartCard` 空 figure 失败提示、data_entry_ai fixtures + 单测 + MiniMax live smoke 已合入本分支。更细运行说明见 `docs/ai-analysis-upgrade.md`。

---

## 0. 结论摘要

当前 AI 分析是「**前端 ReAct + 后端 OpenAI 兼容 SSE 代理**」：意图、Schema、出图全部压在同一主循环与一份超长 `SYSTEM_PROMPT` 上。对复杂科研文档（SOP、多 Sheet CRO Excel、多表流水线）会出现三条稳定失败链：

1. **意图理解弱**：没有结构化 Intent 阶段；计划步骤是自由文本；复杂目标易被「一个 Custom Code 吐所有表」绕过，图表/提醒/看板常被跳过。  
2. **表/Schema 理解弱**：工作区上下文只注入前 6 表 × 3 样例行；附件全文硬截断 8k；`get_table_schema` 无语义角色/分布；多表时模型反复探路仍选错列。  
3. **图表执行/展示不可靠**：`create_view` → `set_chart_config` 两段式易半完成；槽位混淆虽有纠偏但仍会校验失败；`AiChartCard` 捕获异常后只显示「图表构建失败」，错误不回灌模型、不进轨迹详情；长跑证据显示复杂场景经常**无图无看板**。

升级方向（推荐）：在现有 ReAct 上增加薄的 **Intent → SchemaPack → AnalysisPlan → ChartSpec** 契约层，强化 Schema 注入与图表「一次成功」工具，并用 `data_entry_ai` 的 EO035 / Skill / 本仓 HAI 生命周期文档作为验收夹具。

---

## 1. 端到端流水线地图

### 1.1 时序（用户一句话 → 图表出现在抽屉）

```
用户输入 / 附件（AiInputBar.vue）
  → aiStore.sendMessage（aiStore.ts）
      ├─ 上传附件 → POST /api/ai/files（aifiles.go）
      ├─ 可选 importAsTable → importAiAttachment（attachments.ts）
      ├─ 组装 messages：
      │     system: SYSTEM_PROMPT（prompts.ts）
      │     system: Skills 目录 / Memories（可选）
      │     system: buildAnalysisContext（context.ts）
      │     system: 附件目录 + 本轮附件正文（attachments.ts，clip 8k）
      │     system: @mention / wantReport 提示
      │     history user/assistant…
      └─ runAgent（agentLoop.ts）
            循环：
              POST /api/ai/chat（insight-api-go ai.go → 上游 OpenAI 兼容）
              ← SSE delta / tool_calls
              → 本地 execTool（tools/impl.ts）写 analysisStore / dashboardStore
              → tool result 回灌（clipToolResult 2.5k–4k）
              直到无 tool_calls 或计划门禁 / 超轮 / 中止
  → UI：PlanChecklist / TraceCard / ArtifactCard
      → view 产物：AiChartCard → runPipeline + buildChartOption → ChartPanel
```

### 1.2 关键文件与职责

| 层 | 路径 | 职责 |
| --- | --- | --- |
| UI 壳 | `insight-studio/src/modules/ai/AiDrawer.vue`, `AiFab.vue`, `AiInputBar.vue`, `AiMessageList.vue` | 抽屉、输入、消息流 |
| 会话编排 | `insight-studio/src/modules/ai/aiStore.ts` | 组 prompt、跑 agent、产物/续跑/压缩 |
| 系统提示 | `insight-studio/src/modules/ai/prompts.ts` | `SYSTEM_PROMPT`（能力 + 图配置示例 + 风格） |
| 工作区上下文 | `insight-studio/src/modules/ai/context.ts` | 表摘要 / @引用 |
| 附件 | `insight-studio/src/modules/ai/attachments.ts` | 抽取、截断、导入表 |
| Agent 循环 | `insight-studio/src/modules/ai/agentLoop.ts` | ReAct、计划门禁、子代理、stall |
| 计划文案 | `insight-studio/src/modules/ai/taskState.ts` | 催促、续跑检查点、tool 截断 |
| 工具 Schema | `insight-studio/src/modules/ai/tools/registry.ts` | OpenAI function tools |
| 工具实现 | `insight-studio/src/modules/ai/tools/impl.ts` | 读写分析/步骤/图/看板 |
| 子代理 | `insight-studio/src/modules/ai/tools/workers.ts` | 规划师/分析师/工程师/MCP |
| 图表纠偏 | `insight-studio/src/modules/ai/normalizeChartConfigure.ts` | 槽位纠正、字段对齐、autofill |
| 图表预览 | `insight-studio/src/modules/ai/AiChartCard.vue`, `ArtifactCard.vue` | 产物卡内嵌小图 |
| 图表内核 | `insight-studio/src/modules/charts/registry.ts`, `ChartPanel.vue` | `buildChartOption` / 校验 |
| HTTP 客户端 | `insight-studio/src/modules/ai/client.ts` | SSE 解析、config/conv/files API |
| 后端代理 | `insight-api-go/internal/api/ai.go`（对照 `insight-api/src/ai.ts`） | config 掩码、SSE 转发、会话 CRUD |
| 设计说明 | `insight-studio/DESIGN.md` §9 | 架构总览（部分数字已过时，如 maxIterations） |

### 1.3 关键 API（数据契约）

| API | 契约要点 |
| --- | --- |
| `GET/PUT /api/ai/config` | `{ baseUrl, apiKey, model, models[], maxIterations, confirmDestructive, confirmWrite }`；GET 只回 `apiKeyMasked` + `configured` |
| `POST /api/ai/chat` | 请求体为 OpenAI `chat/completions`（messages/tools/model/stream）；服务端注入 Key，SSE 原样代理 |
| `GET/POST/PATCH… /api/ai/conversations*` | 会话 CRUD；messages JSON 含 trace/artifacts/plan |
| `POST /api/ai/files` + download | 聊天附件二进制；kind=`csv|excel|text|pdf|image|other` |
| `GET /api/ai/skills*` / `GET /api/ai/mcp/tools` | Skills 目录与 MCP function 合并进 tools |

**前端内部契约（升级时要显式化）：**

- `ToolExecResult`: `{ ok, summary, artifact?, needsConfirmation? }`（`agentLoop.ts`）
- `Artifact`: `{ kind, name, analysisId?, tableId?, viewId?, viewType?, … }`（`types.ts`）
- Chart configure：按图种分槽（bar 用 `y` 对象；scatter/line 用 `values[]`；聚合字段名 `aggregation`）——见 `prompts.ts` + `normalizeChartConfigure.ts`
- Custom Code：`custom_code(inputs) -> list[IOData]`；Python Figure → `chartId=stepId::name`

### 1.4 当前「分析阶段」实际是什么

| 阶段（产品语言） | 现状实现 | 有无独立契约 |
| --- | --- | --- |
| 意图解析 | 模型读用户句 + SOP 附件 + 巨型 system prompt，自行 `submit_plan` | **无**结构化 Intent |
| 数据/表理解 | `buildAnalysisContext` + 可选 `list_tables` / `get_table_schema` | **弱**；无 SchemaPack |
| 分析计划 | `submit_plan({ steps: string[] })` 自由文本 3–6 步 | **弱**；无目标类型/验收条件 |
| 图表生成 | `create_view` + `set_chart_config`（+ autofill/validate） | 半结构化；易半完成 |
| UI 渲染 | Artifact → AiChartCard → Plotly option | 有；失败时静默 |

---

## 2. 三大失败域：模式 + 代码证据

### 2.1 意图理解差

| 失败模式 | 证据 | 影响 |
| --- | --- | --- |
| **无 Intent 路由层** | `aiStore` 直接把用户句塞进 ReAct；对比 `data_entry_ai` 有 `intent.py` / 设计中的 AI Intent（`docs/superpowers/specs/2026-09-04-ai-intent-session-rules-design.md`） | 「出图 / 只问答 / 改口径 / 续跑」混在一起，复杂指令被拆坏 |
| **计划是自由文本** | `submit_plan` 仅 `steps: string[]`（`registry.ts`）；无 `goal_type`、无验收断言 | 模型勾完计划也不等于业务目标完成（AUDIT：无图仍可 mark_done） |
| **SOP 被截断** | `attachments.clipText(..., 8000)`；复杂 HAI 文档后半筛选/命名规则易丢失 | 意图残缺 → 筛错候选、漏提醒 |
| **绕过平台步骤语义** | AUDIT：端口失败后改用「一个 Custom Code 吐全部表」；流程图无法表达业务链 | 「分析」变成「造数」，意图中的 Filter/Join/图被丢弃 |
| **业务规则未强制落地** | `prompts.ts` 要求 >3 倍 BLI 差异提醒；AUDIT 见重复 Kd 无提醒表/文案 | 用户感知「没听懂要求」 |
| **过程独白 / 假结束** | `contentScrub` + 计划门禁；CAPABILITY-RESULTS：filter-chart 产物齐但 UI「正在生成」超时 | 看起来像没理解/没完成 |

**根因判断：** 意图理解依赖「超长 prompt + 模型自觉」，缺少 **IntentSpec**（目标类型、必交付产物、约束、禁止项）在进工具循环前落地。

### 2.2 表 / Schema 理解差

| 失败模式 | 证据 | 影响 |
| --- | --- | --- |
| **工作区 Schema 过瘦** | `context.ts`：最多 6 表、每表 3 样例行、只列 `title(dataType)` | 多表分析时模型看不到后半表；列语义靠猜 |
| **探路工具信息不足** | `get_table_schema`：列名+类型+5 行样例；无 null 率、唯一值、数值范围、角色（id/measure/category） | 复杂表头（CRO 中英混排、单位进表头）映射失败 |
| **list_tables 无列清单** | `impl.ts` `list_tables` 只给行数/列数/视图 | 多表场景必须连环 `get_table_schema`，耗轮次且易截断（tool clip 2.5k） |
| **附件预览丢结构** | Excel：每 sheet 最多 80 行再整体 8k clip；多 sheet ADME/PK 报告结构被砍 | 模型以为「只有几列」或选错 sheet |
| **列名特殊字符** | prompt 已警告 `IC50(nM)` 必须 `[方括号]`；仍靠模型记忆 | computed/filter 表达式失败 → 反复重试 |
| **误 import 说明文档** | AUDIT / traces：对 `.md` 调 `import_ai_file`；虽有拒绝文案，仍浪费轮次 | Schema 为空时误判「没数据」 |

**根因判断：** 缺少 **SchemaPack**（稳定注入的机器可读表目录：列 field/title/type、样例、统计、业务角色、来源步骤），也缺少「复杂附件 → 结构化摘要」而不是裸文本截断。

### 2.3 图表执行 / 展示失败

| 失败模式 | 证据 | 影响 |
| --- | --- | --- |
| **两段式建图易半完成** | `create_view` 立刻返回 view 产物；`set_chart_config` 另一步才写 configure | 产物卡先出现；未配置时 `AiChartCard` 构建失败 |
| **槽位方言** | bar 要 `y` 对象；scatter 要 `values[]`；模型常写 `y:[]` / `aggregate` | 虽有 `normalizeAiChartConfigure` + autofill，复杂多字段仍失败 |
| **校验失败只回模型** | `set_chart_config` → `validateChartMapping` → `fail(formatChartMappingFailHint)` | 用户侧可能无可见图；轨迹摘要偏技术 |
| **预览错误静默** | `AiChartCard.vue`：`catch { failed.value = true }` → 文案「图表构建失败」 | **无 error message、不回灌 agent、不进 trace** |
| **复杂长跑不出图** | AUDIT 产物表：有 summary 表但「无图表/看板」；r1 prompt 明确要求分布图/Kd 图 | 用户主诉求落空 |
| **收尾态与产物不同步** | CAPABILITY-RESULTS：filter-chart 已配 bar，驱动因 idle「正在生成」超时 | 「执行成功但展示/状态失败」 |
| **MiniMax 思考泄漏** | `docs/dev/ai-agent-lifecycle-test/MINIMAX-M2.7-20260902.md`：`<think>` 进 content | 干扰总结与后续意图 |

**根因判断：** ChartSpec 未在工具层原子化；成功路径缺「配置完成 ⇒ 预览可构建」的硬门禁；失败路径缺结构化错误回传 UI。

---

## 3. MiniMax / OpenAI 兼容客户端与配置

### 3.1 现状（不要写死 Key）

- **唯一生产路径：** 前端 `postChat` → `POST /api/ai/chat` → Go `ai.go` 读 **`data/ai-config.json`**，把 `Authorization: Bearer <apiKey>` 加到 `{baseUrl}/chat/completions`。
- **配置入口：** UI `AiSettingsModal.vue` → `PUT /api/ai/config`（字段 `baseUrl` / `apiKey` / `model` / `models` / `maxIterations`…）。
- **默认值：** `baseUrl=https://api.openai.com/v1`，`model=gpt-4o-mini`（`ai.go` `defaultAiConfig`）。
- **已验证兼容：** Moonshot、Aliyun Qwen、**MiniMax**（`https://api.minimaxi.com/v1`，模型如 `MiniMax-M2.7-highspeed`）——见 `MINIMAX-M2.7-20260902.md`。
- **环境变量：** 当前 **没有** 读取 `MINIMAX_API_KEY` / `OPENAI_API_BASE` / `OPENAI_API_KEY`。DB 等有 `INSIGHT_*` env，AI Key 仅文件 + UI。

### 3.2 升级时配置约定（实现阶段必须遵守）

| 变量（建议） | 含义 | 优先级建议 |
| --- | --- | --- |
| `OPENAI_API_BASE` 或 `AI_API_BASE_URL` | OpenAI 兼容根路径（含 `/v1`） | 启动时若 `ai-config.json` 无 baseUrl 则回填 |
| `OPENAI_API_KEY` 或 `MINIMAX_API_KEY` | 密钥 | 仅进程环境 / 密钥管理；**禁止写入仓库文件** |
| `AI_MODEL` | 默认模型名 | 同上 |

**硬约束：** 永不把真实 Key commit 进 git、文档示例、fixtures；文档与 PR 只用占位符。UI 继续掩码回显。

---

## 4. `data_entry_ai` 如何作为本仓测试夹具

### 4.1 样例资产位置（兄弟仓）

仓库：`https://github.com/DavidDeng9896/data_entry_ai`

| 路径 | 用途 |
| --- | --- |
| `doc/EO035/CADD原始数据/**/*.csv` | 多文件对接/药效团数值表 → 导入 + 出图 |
| `doc/EO035/EO035药理测试原始数据/**/*.xlsx` | 复杂多 Sheet CRO（ADME / HCT116 / 鼠 PK）→ Schema 理解压测 |
| `doc/EO035/CADD原始数据/数据说明.txt` | 短说明附件（text kind） |
| `doc/skills/*.md` | CRO 版式 Skill（CYP、PPB、PK、hERG…）→ 可对照本仓 Skill 注入 |
| `doc/AI_data_import/*` | 导入 agent 规范 / baseline prompt（意图与确认闸参考） |
| `backend/app/services/{intent,schema_*}.py` | Intent/Schema 设计对照实现 |

### 4.2 本仓已有同类流动（可复用模式）

| 资产 | 流动方式 |
| --- | --- |
| `docs/dev/ai-agent-lifecycle-test/hai-club-data-lifecycle.md` | 作为 **聊天附件**（kind=text）：正文进 `buildAttachmentContext`，**禁止** `import_ai_file` |
| `r1-prompt.md` / `r2-prompt.md` | 用户指令正文（Playwright fill） |
| `run-capability-live.mjs` / `run-minimax-*.mjs` | 真机驱动；摘要 JSON 不含 Key |
| 单测 `import_csv_text` / e2e `ai.spec.ts` | mock chat + 真工具落地 |

### 4.3 推荐夹具接入方式（实现阶段）

**不要**把巨型 xlsx 二进制默认 commit 进本仓（体积）。推荐：

1. **Git submodule 或稀疏检出** `data_entry_ai/doc/EO035` → 本地/CI 路径如 `.fixtures/data_entry_ai/`（gitignore 大文件可选 LFS）。  
2. **Fixture 清单 YAML**（本仓可 commit）：记录相对路径、期望 sheet、验收意图、期望图种。  
3. **流入 App 的三条通道：**  
   - A. UI：AI 抽屉上传 Excel/CSV（`import_ai_file`）+ 可选附上 Skill md；  
   - B. 测试：`aiFilesApi` mock 或直接 `import_csv_text` / `commitImportedTable` 预置表，再跑 agent；  
   - C. 文档上下文：把 `数据说明.txt` / Skill md 当 text 附件，验证「只读不 import」。  
4. **黄金场景（验收用）：**  
   - EO035 单份 HCT116 报告 → 识别数值列 → bar/line IC50；  
   - EO035 鼠 PK 多文件 → 多表 join/汇总 → Kd/AUC 对比图；  
   - HAI lifecycle md + 程序化大表（已有）→ 筛选分布图 + Kd 对比图 + >3× 提醒。

---

## 5. 升级架构（推荐方案）

### 5.1 方案对比

| 方案 | 做法 | 优点 | 缺点 | 建议 |
| --- | --- | --- | --- | --- |
| A. 只改 prompt | 继续堆 `SYSTEM_PROMPT` | 改动小 | 复杂数据仍不稳 | 否 |
| B. **契约层 + 工具增强（推荐）** | IntentSpec / SchemaPack / ChartSpec；原子建图；错误回灌 UI | 可测、可验收、兼容现有 ReAct | 中等改动面 | **是** |
| C. 后端编排新服务 | 分析逻辑迁 Go | 集中 | 与「工具写前端 store」架构冲突大 | 否（本期） |

### 5.2 目标流水线（在现有 ReAct 上叠加）

```
UserTurn
  → IntentCompiler（短 structured 调用或首轮强制 tool）
       IntentSpec { goals[], deliverables[], constraints[], data_refs[] }
  → SchemaAssembler（确定性代码，不靠模型）
       SchemaPack { tables[], columns[], stats?, attachment_summaries[] }
  → PlanGate（submit_plan 升级或并行 AnalysisPlan）
       AnalysisPlan { steps: { id, action, accepts[] }[] }
  → Execute（现有 tools + 新 chart_upsert）
  → RenderGate
       每个 chart deliverable：validate + buildChartOption 成功才 mark 完成
```

### 5.3 拟新增/扩展契约

```ts
// 建议落在 insight-studio/src/modules/ai/contracts.ts（实现阶段）

type IntentGoalType =
  | 'ingest' | 'transform' | 'analyze_stat' | 'chart' | 'dashboard' | 'report' | 'clarify'

interface IntentSpec {
  goals: Array<{ type: IntentGoalType; text: string }>
  deliverables: Array<
    | { kind: 'table'; nameHint: string; minRows?: number }
    | { kind: 'chart'; chartType: string; titleHint: string; x?: string; y?: string[] }
    | { kind: 'note'; text: string } // 如「>3× 重复差异提醒」
  >
  constraints: string[]
  ambiguity?: string // 非空则先 ask_user
}

interface SchemaPack {
  analysisId: string | null
  tables: Array<{
    id: string
    name: string
    rowCount: number
    columns: Array<{ field: string; title: string; dataType: string; role?: string }>
    sampleRows: Record<string, unknown>[]
    viewIds: Array<{ id: string; type: string; configured: boolean }>
  }>
  attachments: Array<{ id: string; name: string; kind: string; summary: string }>
}

interface ChartSpec {
  tableId: string
  chartType: string
  name?: string
  configure: Record<string, unknown>
  style?: Record<string, unknown>
}
```

### 5.4 按失败域的改造清单（给实现工程师）

#### A. 意图理解

| 改什么 | 文件 | 做什么 |
| --- | --- | --- |
| IntentCompiler | 新 `intentCompile.ts` + `aiStore` 发送前/首轮 | 产出 `IntentSpec`；模糊则 `ask_user`；注入为 system 块 |
| 升级计划工具 | `registry.ts` / `agentLoop.ts` / `taskState.ts` | `submit_plan` 接受可选 `deliverables[]`；未满足 deliverable 不得 `done` |
| Prompt 瘦身 | `prompts.ts` | 业务细则下沉到 SchemaPack + Skill；保留硬规则短列表 |
| 附件策略 | `attachments.ts` | SOP/md：结构化摘要（章节标题+表格抽取）替代纯 8k 盲截；保留全文按需 `read_attachment_section` 工具 |
| 对照 | `data_entry_ai` Intent 设计 | 借鉴 action/clarify/session_rules，不必照搬导入产品语义 |

#### B. 表/Schema 理解

| 改什么 | 文件 | 做什么 |
| --- | --- | --- |
| SchemaAssembler | 新 `schemaPack.ts`；改 `context.ts` | 每轮确定性注入完整 SchemaPack（可按 token 预算分层：目录全量 + 焦点表详版） |
| 增强 `get_table_schema` | `impl.ts` | 增加 role 启发式、数值范围、top categories、null 率；返回 JSON 友好结构 |
| `list_tables` | `impl.ts` | 可选 `includeColumns=true` |
| Excel 摘要 | `attachments.ts` | 每 sheet：表头 + dtype 推断 + 行数 + 前 N 行；多 sheet 目录优先 |
| 字段解析 | 已有 `resolveConfigureFields` | 扩展到 filter/computed 参数；统一「title→field」 |

#### C. 图表执行 + 展示

| 改什么 | 文件 | 做什么 |
| --- | --- | --- |
| 原子工具 `upsert_chart` | `registry.ts` + `impl.ts` | 单次：create_or_update view + normalize + autofill + validate + **试跑 buildChartOption**；失败不建半成品产物 |
| 废弃两段式为兼容路径 | prompts | 引导优先 `upsert_chart`；保留旧工具一至两个版本 |
| AiChartCard 可诊断 | `AiChartCard.vue` | 展示 `error.message`；可选 `data-testid` 细节 |
| RenderGate | `agentLoop` / `taskState` | Intent deliverable 含 chart 时，预览失败 ⇒ 计划未完成 |
| 轨迹 | `traceLabels.ts` | 配图失败摘要对用户可读（缺哪些槽/列） |
| MiniMax | `contentScrub.ts` / `client.ts` | 剥离 `<think>…</think>`；优先 `reasoning_content` |

#### D. 配置（env）

| 改什么 | 文件 | 做什么 |
| --- | --- | --- |
| Env bootstrap | `insight-api-go/internal/api/ai.go` + `.env.example` | 启动时若配置文件缺 Key/Base，从 `MINIMAX_API_KEY`/`OPENAI_API_KEY` + `OPENAI_API_BASE` 填充；**不把 Key 写入示例文件** |
| 文档 | README / DESIGN | 说明优先级：UI 已存配置 > env > 默认 |

---

## 6. 验收标准（复杂 `data_entry_ai` 文档）

### 6.1 夹具集（最低）

| ID | 输入 | 用户意图（示例） | 必须通过 |
| --- | --- | --- | --- |
| F1 | EO035 HCT116 单 xlsx | 「导入并画抑制曲线/IC50 对比柱状图」 | Intent=`ingest+chart`；Schema 列识别正确；`upsert_chart` ok；AiChartCard 非「构建失败」 |
| F2 | EO035 鼠 PK ≥2 xlsx | 「汇总 AUC/F 并对比化合物」 | 多表 SchemaPack 可见；有汇总表；至少 1 张对比图 |
| F3 | CADD csv 目录 + 数据说明.txt | 「说明文档只读，数据画散点」 | 不 `import_ai_file` 说明；csv 入表；scatter 预览成功 |
| F4 | 本仓 `hai-club-data-lifecycle.md` + r1 指令 | 现有生命周期长跑精简版 | 大表 >1000 行；筛选表；**至少 2 张图**；>3× 差异有提醒；计划完成且 UI 非永久「正在生成」 |
| F5 | 无附件模糊句「帮我看看数据」 | clarify | `ask_user` 或 Intent.ambiguity，不瞎造表 |

### 6.2 工程门禁

- 单测：IntentSpec 解析、SchemaPack 序列化预算、`upsert_chart` 槽位方言、AiChartCard 错误文案。  
- mock e2e：扩展 `tests/e2e/ai.spec.ts` 覆盖「原子建图产物可点开」。  
- 真机（可选 MiniMax）：复用 `run-minimax-*.mjs` 模式，结果 JSON **脱敏**入库。  
- 禁止回归：不在仓库出现真实 API Key。

### 6.3 成功定义（产品）

对 F1–F4：**意图交付物 100% 可在 UI 点到**（表或图）；图表预览失败率在夹具集上 **= 0**；复杂 SOP 场景不再以「无图总结」算完成。

---

## 7. 建议实现切片（供下一工程师拆 PR）

1. **P0 图表可靠性：** `upsert_chart` + AiChartCard 错误暴露 + RenderGate（先修用户最痛的「有分析无图/图挂了」）。  
2. **P0 SchemaPack：** 替换/增强 `buildAnalysisContext`；增强 `get_table_schema`。  
3. **P1 IntentSpec + deliverable 门禁：** 计划完成 ≠ 业务完成。  
4. **P1 附件结构化摘要 + data_entry_ai fixture 清单。**  
5. **P2 env 引导配置 + MiniMax think 剥离 + prompt 瘦身。**

每一切片应带：单测 → mock e2e →（可选）真机一条 EO035 场景。

---

## 8. 非目标（本升级不做）

- 把 ReAct 整段搬到后端。  
- 重做看板/流程图 UX。  
- 自动把 `data_entry_ai` 全量二进制 vendor 进本仓。  
- 在文档或代码中写入任何真实 API Key。

---

## 9. 参考索引

- 本仓真机审计：`docs/dev/ai-agent-lifecycle-test/AUDIT.md`、`CAPABILITY-RESULTS.md`、`MINIMAX-M2.7-20260902.md`  
- 架构：`insight-studio/DESIGN.md` §9  
- 子代理/计划门禁：`docs/superpowers/specs/2026-08-06-ai-subagent-plan-gate-design.md`  
- 兄弟仓意图：`data_entry_ai` → `docs/superpowers/specs/2026-09-04-ai-intent-session-rules-design.md`  
- 兄弟仓 Schema 提示：`data_entry_ai` → `backend/app/services/schema_prompt.py`

---

## 10. Self-review（本调查文档）

- [x] 无 TBD/空壳章节  
- [x] 三条失败链均有文件级证据  
- [x] 升级计划点名文件与契约  
- [x] 验收绑定 data_entry_ai / 本仓 HAI 夹具  
- [x] 密钥策略明确（env，不入库）  
- [x] 范围排除产品代码（本轮仅文档）
