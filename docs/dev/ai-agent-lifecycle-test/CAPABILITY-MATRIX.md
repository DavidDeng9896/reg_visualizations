# AI Agent 能力矩阵与分层测试协议

**日期：** 2026-08-13  
**目标：** 把「主 agent / 子代理 / 流程图节点 / 对话 UX」测全，而不是只靠一次生命周期长跑。  
**约束：** 真实模型受 Moonshot TPD/RPM 限制；能自动、不耗配额的层必须先绿。

---

## 1. 怎么测（三层）

| 层 | 是否打真实模型 | 覆盖什么 | 入口 |
| --- | --- | --- | --- |
| A 单测 | 否 | 每个 agent 工具的真实 `execTool`、端口连线、子代理白名单、loop 派工 | `npx vitest run tests/unit/ai tests/unit/steps` |
| B mock e2e | 否（拦截 `/api/ai/chat`） | 对话 UI：计划/轨迹/产物/确认/提问/中止/配额失败后续跑；多节点落地到流程图 | `npx playwright test tests/e2e/ai.spec.ts` |
| C 真实模型 | 是（短 prompt、小表） | 模型是否真会选对工具；四个子代理各一条；UX 走查 | `run-capability-live.mjs`（14 日已跑，见 `live-20260814.json`） |

生命周期长跑（r1/r2 + 过千行宽表）仍以 `AUDIT.md` 为准，本矩阵不重复造 4000 行。

---

## 2. 主 agent 工具

协议级（loop 内置，不走 `impl.ts`）：`submit_plan` `mark_step_done` `ask_user` `delegate_*_worker`。

| 工具 | 作用 | A 单测 | B mock e2e | C 实跑 |
| --- | --- | --- | --- | --- |
| submit_plan / mark_step_done | 计划门禁 | agentLoop.spec | ai.spec 建图 | 长跑已见 |
| ask_user | 提问卡暂停 | agentLoop.spec | ai.spec 选择卡 | 长跑驱动会答 |
| list_analyses / list_tables / get_table_schema | 探路 | impl 部分 | 编排里会调 | 长跑已见 |
| create_analysis | 新建/同名复用 | 同名复用 | — | 长跑已见 |
| import_csv_text | 粘贴 CSV | 有 | 管道编排 | 短场景 |
| import_ai_file / list_ai_files | 附件导入；拒 md | 拒 md + csv | — | 长跑 SOP |
| add_filter_step | Filter + 连线 | 有；管道补端口 | 管道 | 修后复测已通 |
| add_join_step | Join 两表 | **补** | 管道 | 短场景 |
| add_union_step | Union | **补** | — | 短场景（配额允许） |
| add_computed_column_step | 派生列 | 有 | 管道 | — |
| add_hide_columns_step | 藏列 | **补** | 管道 | — |
| add_custom_code_step / update / run_step | Python | 有；占位 stepId | — | 长跑工程师 |
| create_report_step / update_report_step | 报告节点 | **补** | 管道 | — |
| rerun_stale_steps / refresh_sql_source | 重跑 / SQL 源 | 刷新需 SQL 源，本轮不造假库 | — | — |
| create_view / set_chart_config | 出图 | 有 | 建图 + 管道 | 短场景 |
| create_dashboard / add_dashboard_widget | 看板 | **补** | 管道 | — |
| delete_table / delete_view / delete_step / clear_analysis | 危险操作 | table/clear 有；**补 step** | 删除确认 | — |
| list_skills / read_skill / save_memory | Skill/记忆 | skillsMcp / memories | — | 规划师短场景 |
| delegate_skill_worker | 规划师 | agentLoop 嵌套 | — | 短场景 |
| delegate_mcp_worker | MCP 专家 | **补 loop mock** | — | 无 MCP 则记跳过 |
| delegate_analysis_worker | 分析师 | **补 loop mock** | — | 短场景 |
| delegate_code_worker | 工程师 | **补 loop mock** | — | 长跑已见 |

---

## 3. 子代理白名单

| 子代理 | 角色 | 允许做什么 | 禁止 |
| --- | --- | --- | --- |
| 规划师 | skill | `list_skills` `read_skill` | 改表、出图、MCP |
| MCP 专家 | mcp | 全部 `mcp_*` | 内置分析工具 |
| 分析师 | analysis | 探路 + 导入 + filter/join/union/computed/hide + custom code + 出图 + 看板 + 报告 | 删除类 |
| 工程师 | code | schema + custom code + run/rerun | 出图、join、删除 |

严格模式：分析师/工程师若只 list/schema 就收工 → `ok: false`。

---

## 4. 流程图节点

`listStepDefs()` 全量注册；真正能执行的只有 `IMPLEMENTED_STEP_TYPES` + 源步骤（upload-csv/xlsx、query-sql）。

| 节点 type | 执行层 | Agent 工具 | 人手流程图 e2e |
| --- | --- | --- | --- |
| upload-csv | 导入即配置 | import_csv_text / import_ai_file | steps.spec Import CSV |
| upload-xlsx | 导入 | import_ai_file | — |
| query-sql | 源 + refresh | refresh_sql_source（无「新建 SQL 源」工具） | — |
| join / union | exec 已实现 | add_join_step / add_union_step | steps.spec Combine + 拖线 Filter→Join |
| filter / hide-columns / computed-column | exec 已实现 | 对应 add_* | 拖线 Filter |
| custom-code | Python worker | add/update_custom_code_step | — |
| report | 独立节点 | create/update_report_step | — |
| import-files / file-to-table | **未实现 exec** | **无** | 仅注册表 |
| convert-formats / find-replace / aggregate / bin / pivot / window / format-columns / dedupe / sort / interpolation | **未实现 exec** | **无** | 仅注册表；Add step 面板不应列出 |

Agent **无法**配置未实现节点——这是产品缺口，不是测试漏跑。矩阵里标「agent 无法配置」，人手也只能拖出未实现节点（若面板隐藏则测不到）。

端口：除 Custom Code 表口为 `Output datasets` 外，其余表口为 `Output dataset`。`tableOutputPortName` / `resolveTableOutputPort` 必须对全部已实现类型成立。

---

## 5. 对话 UX

| 场景 | A | B mock e2e | C |
| --- | --- | --- | --- |
| 计划打勾 → 轨迹 → 思考 → 产物点开工作区 | loop | 已有建图 | 长跑部分 |
| 危险删除确认卡 | impl | 已有 | — |
| ask_user 选项卡 | loop | 已有 | 长跑驱动 |
| 写入前确认（confirmWrite） | **补 impl** | — | 权限「请求权限」 |
| 配额/TPD 失败文案 + 「继续任务」 | modelError | **补**（不重试、露出续跑） | 若当日 TPD 尽 |
| 用户中止后保留检查点、可续跑 | userAbort | **补** | 勿点 stop 的长跑驱动除外 |
| 产物打开大表/图 | — | 建图已点图表卡；管道再点表卡 | 短场景 |
| 中文进展（模型语言） | — | mock 中文 | 实跑观察（不强制改模型） |

---

## 6. 本轮执行顺序

1. 写下本矩阵（本文）。
2. 补 A：未覆盖工具 + 多节点端口管道 + 子代理 loop + 节点/工具映射单测。
3. 补 B：管道落地、TPD 后续跑、中止后续跑。
4. 跑 vitest + playwright ai.spec；记录结果。
5. 探测 TPD；能跑则短实跑四条，不能则记阻塞并依赖 A/B。
6. 写 `CAPABILITY-RESULTS.md`，提交，更新 PR。
