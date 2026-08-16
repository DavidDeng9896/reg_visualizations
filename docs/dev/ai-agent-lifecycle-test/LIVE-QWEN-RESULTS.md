# Qwen 兼容端真实模型 live 测试

- 时间：2026-08-16
- 请求模型：`qwen3.7-flash`（该 token-plan `/models` **不存在**，404 `model_not_found`）
- 实测模型：`qwen3.6-flash`（同套 key 目录中最接近的 flash；另可用 `qwen3.7-plus` / `qwen3.7-max`）
- 端点：`https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`
- 运行时：insight-dsh 真实 boot（非 mock）+ Node insight-api :8787（无 MariaDB / 无 Python worker / 无 Go Skills）
- Node：真实 boot 需要 **≥ 22.15**（jsonl session 依赖 `zlib.createZstdDecompress`）；环境默认 22.14 无法 boot

## 探针（直连兼容端）

| 请求 | 结果 |
| --- | --- |
| `qwen3.7-flash` | 404 Model not exist |
| `qwen3.6-flash` 无思考 | 200，1 completion token |
| `thinking: {type: disabled}` | 200，关思考 |
| `reasoning_effort: max` | **400**（只接受 none/minimal/low/medium/high/xhigh） |
| `enable_thinking: false` | 200 |
| tools + 关思考 | 200，`finish_reason=tool_calls` |
| `max_tokens: 256000` | **400**（范围 1–65536） |
| `max_tokens: 8192` | 200 |

因此 dsh 必须：`DSH_THINKING=disabled`、`DSH_REASONING_EFFORT=off`、`DSH_MAX_TOKENS≤65536`，并显式传入 `DSH_MODEL`。

## 全量 harness（修复前）

29 场景 / 561s：`pass 26` · `fail 1` · `warn 2`

唯一失败：`multiturn.followup` HTTP 400（长对话 + 工具结果被 dsh-tools 判为非 lossless JSON，模型反复重试）。

普遍现象：`list_tables` / `list_analyses` 返回 `value is not lossless JSON`（`ok()` 带 `artifact: undefined`）。模型会误判「没有表 / 格式错误」并乱调用 `clear_analysis`、`refresh_sql_source`、子代理。

## 修复后再测（lossless JSON）

`LIVE_ONLY` 复跑原先翻车场景：

| id | 修复前 | 修复后 |
| --- | --- | --- |
| `workspace.list_analyses` | pass 但模型抱怨 JSON 异常 | **pass**，正确列出 26 个分析 |
| `interact.ask_user` | pass 但跑偏（clear/refresh/新建分析） | **pass** 9.5s：先 `ask_user`，自动答「散点图」后出图 |
| `interact.confirm_delete` | 确认后工具 JSON 失败，模型以为表不存在 | **pass** 4s：表已删除 |
| `multiturn.followup` | **fail** HTTP 400 | **pass** 6.7s：先 schema 再散点图 |
| `concurrent.two_sessions` | pass 但两边都说没表 | **pass**：A=ELISA screen，B=SPR kinetics |
| `edge.memory` | warn 未真正调 `save_memory` | 仍 **warn**：模型把函数写成正文（Node API 无 `/api/ai/memories`） |

## 能力覆盖（模型确实会调的工具）

`submit_plan` `mark_step_done` `ask_user` `list_analyses` `list_tables` `get_table_schema` `create_analysis` `import_csv_text` `add_filter_step` `add_join_step` `add_union_step` `add_computed_column_step` `add_hide_columns_step` `create_view` `set_chart_config` `create_dashboard` `add_dashboard_widget` `create_report_step` `delete_table` `list_skills` `list_ai_files` `add_custom_code_step` `delegate_analysis_worker` `delegate_skill_worker`

未真正调用（模型用自然语言代替或环境缺失）：`save_memory`、`refresh_sql_source`（无 SQL 源时拒绝调用是合理的）、`import_ai_file`（无附件服务）。

## 环境缺口（不是模型不会，是后端没有）

- Node insight-api 无 Skills / Memories / AI Files / MCP → 对应工具 404，模型能诚实说明
- Python worker 未启动 → Custom Code 步骤能创建，执行报 `python worker unreachable`
- 无 MariaDB → 本轮走 sqlite Node API
- DeepSeek 适配器 **text-only**：图片块不会进模型，回复「无法查看图片」

## 产品侧已随测试落地的修复

1. 阿里云兼容网关自动关思考 + 限制 `maxTokens`
2. `DSH_MODEL` 传入 agent，避免默认 `deepseek-v4-flash`
3. 工具 schema 去掉 `description: undefined`（否则 dsh 无法 boot）
4. YAML `!!js` 不能写带冒号的三元表达式
5. LLM `turn/end` error 映射为前端 `error` 事件
6. 工具返回值做 lossless JSON（去掉 `artifact: undefined`）

明细 JSON（含 key 的运行环境请勿入库）：`live-qwen-results.json`（gitignore）。

## UI Playwright（:7100 真实 dsh）

`npx playwright test --config=playwright.live-qwen.config.ts`：**4 passed**。

| 用例 | 结果 |
| --- | --- |
| 输入条显示 qwen 模型 + 无工具闲聊 | pass 6.8s |
| 工作区 list_tables 出现轨迹 | pass 7.3s |
| ask_user 提问卡并提交选项 | pass 1.5m（Vite 代理需关掉 SSE 缓冲，否则 AskCard 钉不出来、会话一直「生成中」） |
| 发送后可中止 | pass 2.6s |

