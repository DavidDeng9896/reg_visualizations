# Design: Custom Code AI 接入主 Agent 循环（skill / 记忆 / 代码执行验证）

**日期：** 2026-08-25  
**状态：** Draft（待评审）  
**来源：** 用户反馈 Custom Code AI「毛病很多、动不动整一半就停止」；确认方向：统一走主会话 agent 循环、接 skill 与记忆、用科研运行时执行验证、独立会话挂步骤上持久化。

## 1. 背景与问题

Custom Code AI（`CustomCodeAiChat.vue`）目前是**单轮直调**：一次 `postChat` + `readSseStream`，无工具循环、无续跑、无 skill/记忆、不持久化。

典型故障：

| 现象 | 根因 |
|------|------|
| 生成一半停住 | `readSseStream` 不检查 `finish_reason`，输出被长度截断时静默当完成 |
| 断了无法恢复 | 无检查点，半截内容留在界面，用户只能重发 |
| 不会自己验证 | 无执行工具，代码写完只能人工跑；报错后靠 `ingestError` 手动喂 |
| 不记得约定 | 无 skill/记忆，包白名单、契约只靠 system prompt 硬编码 |
| 对话丢失 | 不持久化，关面板即丢 |

主会话 `agentLoop.ts` 已解决上述全部问题：ReAct 多轮循环、`finish_reason`/stall 检测、检查点续跑 + 自动续跑、`postChat` 退避重试、skill/记忆注入与工具、后端会话持久化。

## 2. 目标与非目标

### 目标

- Custom Code AI 复用主会话的 agent 循环内核（`runAgent`），获得：多轮工具调用、续跑、防截断收束、错误重试。
- 新工具 `run_python_code`：用科研运行时（`POST /api/python/execute`）真跑当前代码，拿 stdout / 产物 / 报错，AI 自行迭代修复。
- 接入 skill 与记忆：复用 `list_skills` / `read_skill` / `save_memory` 与每轮注入。
- 会话持久化到后端：每个 Custom Code 步骤一个独立会话（`stepId` 维度），关面板/刷新不丢，可看历史。
- 顺带修复公共缺陷：`readSseStream` 捕获 `finish_reason`，暴露截断信号。

### 非目标

- 不给 Custom Code AI 全套分析工具（建表、建图、看板、报告）——它只写代码，防止跑偏。
- 不改主会话行为与工具集（除共享的 `finish_reason` 修复）。
- 不做跨步骤的会话共享；不与主会话合并历史。
- 不改科研运行时本身（超时、白名单、补包机制照旧）。

## 3. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 架构 | 复用 `agentLoop` 内核，新建场景化 store | 一套续跑/防停/重试逻辑，不维护两套 |
| 会话归属 | 独立会话，以 `stepId` 挂到步骤 | 不污染主会话；一个步骤一份对话史 |
| 持久化 | 后端 `/api/ai/conversations`（扩 `stepId`） | 与主会话同构，复用 `persist` |
| 执行验证 | 科研运行时 `/api/python/execute` | 与正式运行同环境；只读、限时 |
| 工具范围 | skill/记忆 + `run_python_code`，不含分析工具 | 写代码场景聚焦，避免越权改分析 |
| 截断修复 | `readSseStream` 返回 `finishReason`，双方共用 | 公共缺陷一次修复 |
| UI | 保留现有悬浮窗，换底层 | 交互与「应用/插入到光标」不变 |

## 4. 架构

### 4.1 Store 拆分

现 `aiStore.ts` 是「主会话场景 + 循环内核」的混合体。拆为：

- **`agentCore`**（新文件 `ai/agentCore.ts`）：从 `aiStore` 抽出与「场景无关」的状态机：会话消息、`runAgent` 调度、续跑（`continueTask` / `maybeAutoContinue`）、`persist`、中止。参数化：`scope`（场景标识）、`systemComposer`（每轮 system 消息组装）、`toolset`（工具子集）、`conversationMeta`。
- **`useAiStore`**：主会话保持原行为，改为基于 `agentCore` 的场景实例（迁移，不改行为）。
- **`useCodeAiStore`**（新）：Custom Code 场景，`scope: { kind: 'custom-code', analysisId, stepId }`。

> 若拆分成本过高（`aiStore` 与 UI 耦合深），退路：`aiStore` 内加 `scene` 参数双实例，Pinia 用 `defineStore(id, ...)` 动态 id 区分。评审时二选一。

### 4.2 会话持久化扩展

- `POST/GET /api/ai/conversations` 请求/响应体增加可选 `stepId`；`GET` 支持 `?analysisId=&stepId=` 过滤。
- `useCodeAiStore` 打开面板时：按 `(analysisId, stepId)` 查会话，无则惰性创建（首次发送时建）。
- 消息格式沿用主会话（`tool` 角色、瞬态标记），`persist` 逻辑共用。

### 4.3 工具集

| 工具 | 来源 | 说明 |
|------|------|------|
| `list_skills` / `read_skill` | 复用 Go 端 `/api/ai/skills` | 与主会话同源 |
| `save_memory` / 记忆注入 | 复用 Go 端 `/api/ai/memories` | 与主会话同源；可按 `scope` 过滤 |
| `run_python_code`（新） | 前端工具 → `POST /api/python/execute` | 见 §4.4 |

主会话的全套分析工具（`registry.ts`）通过 `toolset` 过滤，不注册给该场景。

### 4.4 `run_python_code` 工具

- 入参：`{ code?: string }`；缺省执行**当前编辑器代码**（工具上下文持有最新代码引用）。
- 执行：调 `customCode.ts` 现有的执行路径（组装 `inputs`、`limits.timeoutSec`），复用科研运行时白名单环境。
- 返回给模型：`stdout`、`error{message,line,type}`、产物摘要（表名/列、文件名、Figure 名称）；**不回传大体积内容**（DataFrame 只给 shape + 前几行，防上下文爆炸）。
- 副作用约束：执行产生的 `go.Figure` **不**自动长流程图节点（那是正式运行的行为）；AI 验证阶段视为草稿运行。评审点：是否需要 `draft: true` 参数区分。
- 频控：单轮内最多连续执行 N 次（建议 3），防空转；沿用 `MAX_TOOL_SPIN` 检测兜底。

### 4.5 上下文与提示

每轮 system 消息由场景 `systemComposer` 组装，保留现契约：入口签名、IOData 类型、上游 `inputsSummary`、白名单、`lastError`、当前代码。新增：

- 技能目录摘要 + 相关记忆（与主会话同一注入逻辑）。
- 明确「写完代码后应调用 `run_python_code` 验证，报错则迭代」。
- 代码同步：用户在编辑器改代码后，下一轮 system 携带最新代码（现状已有）；AI 建议的代码**不自动写回编辑器**，仍走「应用/插入到光标」按钮，避免静默改用户代码。

### 4.6 防「整一半停止」

继承 `agentLoop` 既有机制，另补公共修复：

- `readSseStream` 捕获 `finish_reason`（`length` / `stop` / `tool_calls`）；`length` 视为未完成，触发自动续写（「继续输出未完成的部分」），上限 2 次。主会话同步受益。
- `AgentRunError` 检查点 → 面板显示「继续」按钮（`resumable` 状态），与主会话一致。

## 5. UI 变化（CustomCodeAiChat.vue）

- 底层换 `useCodeAiStore`；保留流式渲染、思考卡、`splitParts` 代码块与「应用/插入到光标」。
- 新增：工具调用轨迹展示（复用主会话 `TraceEvent` 简化渲染：`run_python_code` 显示 stdout/报错摘要）。
- 新增：「继续」按钮（可续跑时）；错误横幅改用 `AgentRunError`。
- `ingestError` 保留：父组件喂报错即发一条 user 消息，agent 循环会自动执行验证。
- 清除对话：删除后端会话（确认弹窗）。

## 6. 实施阶段

| 阶段 | 内容 | 验收 |
|------|------|------|
| P1 止血 | `finish_reason` 修复 + 自动续写；现单轮实现先受益 | 长代码生成不再静默半截 |
| P2 循环接入 | `agentCore` 拆分 + `useCodeAiStore`；`run_python_code` 工具 | AI 能写码→执行→自修，断了能续跑 |
| P3 能力接入 | skill/记忆注入与工具；`stepId` 持久化 | 关面板重开对话还在；能用 skill |
| P4 打磨 | 工具轨迹渲染、频控参数调优、提示微调 | 主观体验验收 |

每阶段独立可合并；P1 与 P2 可并行（P1 改动在 `client.ts`）。

## 7. 测试

- `readSseStream`：`finish_reason=length` 返回截断标记；续写拼接完整。
- `run_python_code`：正常输出回传摘要；报错回传 `error`；超时；DataFrame 只回 shape。
- `useCodeAiStore`：按 `(analysisId, stepId)` 复用/新建会话；续跑；停止（abort）。
- 会话 API：`stepId` 过滤；无 `stepId` 的旧会话不受影响。
- 回归：主会话行为不变（agentCore 拆分后原有用例全绿）。

## 8. 风险

- **agentCore 拆分风险**：`aiStore` 与主会话 UI 耦合较深，拆分可能引入回归。缓解：迁移型重构 + 全量回归；备选双实例方案见 §4.1。
- **上下文膨胀**：代码 + 执行日志多轮累积。缓解：沿用 `compressContext`；执行产物只回摘要。
- **执行安全**：`run_python_code` 跑的是模型生成的代码。缓解：科研运行时已是沙箱（白名单、无网络、限时）；验证阶段 `draft` 不落图节点。
- **模型能力**：小模型可能不会主动调 `run_python_code`。缓解：提示显式要求 + stall 检测兜底。
