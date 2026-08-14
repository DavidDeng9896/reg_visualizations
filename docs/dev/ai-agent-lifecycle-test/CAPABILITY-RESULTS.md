# 能力矩阵实测结论

**日期：** 2026-08-13 写协议与 A/B；**2026-08-14 补 C 层真实模型短场景**  
**协议：** `CAPABILITY-MATRIX.md`  
**单测：** `insight-studio` `tests/unit/ai` + `tests/unit/steps` → **178 passed**  
**Python worker：** `tests/test_executor.py` → **7 passed, 1 skipped**  
**mock e2e：** `tests/e2e/ai.spec.ts` → **6 passed**  
**真实模型短场景（14 日）：** kimi-k2.6，分析 `capability-live`（`3f8f98c0-…`）。四条均有产物；filter-chart 驱动因 UI 停在「正在生成」超时，产物已齐。

---

## A. 单测（不耗配额）

| 块 | 结果 |
| --- | --- |
| 原有 AI 工具（import/filter/computed/chart/custom code/确认删除） | 绿 |
| **新增** join / union / hide / report / dashboard / delete_step / run_step / confirmWrite | 绿 |
| **新增** csv→filter→join→computed→hide→report 端口断言 | 绿；上游口均为 `Output dataset` |
| **新增** 节点↔工具矩阵、`tableOutputPortName` 单复数别名 | 绿 |
| **新增** 分析师/工程师/MCP 子代理 loop + 白名单过滤 | 绿 |
| RPM 502 重试 / TPD 不重试 | 绿（既有 modelError.spec） |

产品缺口（矩阵已标明，不是漏测）：`aggregate` / `pivot` / `bin` / `sort` 等在 `listStepDefs` 注册但 **没有 exec、没有 agent 工具**；Add step 面板只展示 `IMPLEMENTED_STEP_TYPES`。

---

## B. mock e2e（拦截 chat，工具真实落地）

| 场景 | 结果 |
| --- | --- |
| 计划→散点图→产物点开工作区 | 绿（抽屉为 `v-show`，断言改为 hidden） |
| 删除确认（批准条在输入区上方，不再用 `.trace__pending`） | 绿 |
| ask_user 选项提交后续轮 | 绿（已答卡片不在消息里重复渲染，看正文「问/答」） |
| **新增** Filter→Join→派生列→Hide→报告→柱状图→看板，流程图可见节点与连线 | 绿 |
| **新增** 日配额 502：running 结束，「继续任务」收尾 | 绿 |
| **新增** 中止后保留检查点，续跑收尾 | 绿 |

---

## C. 真实模型短场景（2026-08-14）

TPD 已按日重置。探测 `/api/ai/chat` → **200 kimi-k2.6**。驱动：`run-capability-live.mjs`（headed，不点 stop，场景间隔 25s 避开 RPM=3）。

分析：`capability-live` / `3f8f98c0-44a8-4397-bedf-2c723697e493`。摘要：`live-20260814.json`。截图：`evidence/live-*.png`。

| 场景 | 模型是否选对工具 | 产物 | 驱动 |
| --- | --- | --- | --- |
| filter-chart | `import_csv_text` + `add_filter_step` + `create_view`/`set_chart_config` | demo_hits 3 行 → Filter 2 行（去掉 score=1 的 C）→ `score_bar_chart` bar（A≈3, B≈8） | 计划 4/4 已勾完，UI 仍「正在生成」，**idle 180s 超时** |
| join | `import_csv_text`×2 + **`add_join_step` inner on id** | left/right 各 2 行 → Join tables 2 行 `id,v,label` | 绿（151s） |
| analysis-worker | 主循环 import 后 **`delegate_analysis_worker`** | iris_tiny 3 行；分析师建 `species_sepal_length_bar`（x=species, y=sepal_length mean） | 绿（173s） |
| skill-worker | **`delegate_skill_worker`** | 规划师：已安装 6 个 Skill 中文摘要；未改表 | 绿（73s） |

Filter 上游口 `Output dataset`（upload-csv）；Join 两口均为 `Output dataset`。未再打 Custom Code。

**补跑（同日，分析 `capability-live-rest` / `1b7064af-…`）：** 点名 union / hide / report / dashboard，kimi-k2.6 均选对工具。摘要 `live-20260814-rest.json`，截图 `evidence/live-{union,hide,report,dashboard}.png`。

| 场景 | 模型选的工具 | 产物 | 驱动 |
| --- | --- | --- | --- |
| union | **`add_union_step`** | u1+u2 → Union tables **4 行** id,v | 绿（129s） |
| hide | **`add_hide_columns_step`** | wide 去掉 dropme → Hide columns 仅 id,keep | 绿（145s） |
| report | **`create_report_step`** | 独立节点「短跑报告」 | 绿（94s） |
| dashboard | **`create_dashboard` + `add_dashboard_widget`** | 看板「短跑看板」，放入 Union tables | 绿（89s） |

MCP 专家本环境无 `mcp_*`，无法实派（派出会报无可用 MCP）。工程师见 13 日长跑 `AUDIT.md`。

filter-chart 的「步骤已完仍正在生成」与 13 日 RPM 挂起同类：loop 在等收尾文本。产物已在工作区，不算功能失败。

---

## 对话 UX（结合 A/B/长跑）

| 项 | 结论 |
| --- | --- |
| 计划/轨迹/产物/确认/提问 | mock e2e 覆盖；确认卡已挪到 `ai-pending-actions` |
| 中止后续跑 | mock e2e 覆盖；产品保留 incomplete +「继续任务」 |
| TPD/配额文案 + 不自动空转重试 | 单测 + mock e2e；13 日实跑 TPD 尽；14 日短跑配额已恢复 |
| 主区打开大表 | mock 建图会关抽屉进视图；长跑里 agent 很少主动打开表 |
| 子代理实选工具 | 14 日短跑：规划师、分析师已派；工程师见长跑；MCP 无工具未派 |

---

## 环境限制（不是漏测）

MCP 专家需先启用 MCP 服务器（当前无 `mcp_*`，派出会失败）。工程师已在 13 日长跑实派。
