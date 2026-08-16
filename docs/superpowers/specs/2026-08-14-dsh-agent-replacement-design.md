# Design: 用 DeepSeek Harness 完整替换前端 Agent

**日期：** 2026-08-14  
**状态：** 已确认  
**范围：** insight-studio AiDrawer 保留；agent-loop / 平台工具执行迁到 `insight-dsh`（DeepSeek Harness）；Go 仅保留数据面

---

## 1. 已确认需求

| 点 | 结论 |
| --- | --- |
| UI | **A**：保留现有 AiDrawer（计划卡 / 轨迹 / 产物 / ask_user / 确认） |
| 工具执行 | **后端执行**：分析 / 步骤 / 图表 / 看板写入走 HTTP 落库，前端刷新 |
| 能力 | **只增不减**：现有助手能力全部保留，并借 dsh 增强（session log、compaction、subagent 隔离、原生 Skills） |
| 运行时 | **DeepSeek Harness（`dsh`）** 作为 agent 后端 |
| Go | **不能整体替代**：MariaDB 分析/看板/Python 代理是产品数据面，dsh 不是文档库 |
| 范围 | **完整替换**：生产路径不再跑浏览器 `agentLoop` |

## 2. 为何 Go 不能被 dsh 整段替换

dsh 是 agent harness（loop、session、tools、LLM、sandbox）。本产品的科学数据文档（Analysis / Dashboard / table_snapshots / Python worker）必须留在 `insight-api-go`。

技术最优切分：

```
浏览器 AiDrawer  ──SSE/HTTP──►  insight-dsh (dsh agent 平面)
                                      │ 平台工具
                                      ▼
                               insight-api-go (数据平面)
                                      │
                          MariaDB + Python worker :8091
```

| 仍由 Go 负责 | 改由 dsh 负责 |
| --- | --- |
| Analyses / Dashboards / snapshots | Agent loop（替换 `agentLoop.ts`） |
| `POST /api/python/execute` | LLM 适配（DeepSeek 官方 + OpenAI 兼容 Base URL） |
| AI config、Files、Skills、MCP、Memories、会话 UI 快照 | Session 事件日志、compaction、subagent |
| | 平台工具执行（读改 PUT 分析文档） |

`POST /api/ai/chat` 不再被前端调用（保留实现以免旧客户端瞬间 404，但抽屉不走它）。

## 3. 能力映射（不减少）

| 现有 | dsh 落点 | 增强 |
| --- | --- | --- |
| ReAct `agentLoop` | `ctx.agents` + agent-loop | session 可重放 |
| `submit_plan` / `mark_step_done` / 催促续跑 | 平台工具 + turn 结束门禁 | 另挂 `todo_write` |
| 四类 Worker | 独立 child session（上下文隔离） | 比同进程短 loop 更干净 |
| Skills / MCP / 记忆 / 附件 | 工具继续打 Go 用户隔离 API | 可再挂 dsh skill-filesystem |
| `ask_user` / 危险确认 | 工具 `execute()` 挂起，等抽屉回写 | 与现卡兼容 |
| 多模型（含 Qwen 兼容端） | `dsh-llm-deepseek` + `DEEPSEEK_BASE_URL` | 官方 DeepSeek 也可 |
| 思考 / 轨迹 / 产物卡 | session.event → 现有 `AgentEvent` | 前端聚合逻辑复用 |

SQL 刷新：会话请求附带本机连接档案（密码只在当次请求），后端代调 `/api/sql`，避免 localStorage 丢失能力。

## 4. 前端契约

- `POST /api/ai/agent/prompt` 启动一轮；`GET /api/ai/agent/events?sessionId=` SSE
- `POST /api/ai/agent/answer` / `confirm` / `abort` 对应 ask_user、危险确认、中止
- 事件仍映射为 `AgentEvent`，`aiStore.makeOnEvent` 不改卡片协议
- 写工具成功后 `analysisStore.load(id)` 拉齐画布

## 5. 非目标

- 不嵌入 dsh 自带 Web UI
- 不把分析文档迁进 dsh JSONL
- 不在本期删除 Go 的 Skills/MCP/会话 HTTP（能力面板继续用）
