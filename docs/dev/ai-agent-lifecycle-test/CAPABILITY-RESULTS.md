# 能力矩阵实测结论

**日期：** 2026-08-13  
**协议：** `CAPABILITY-MATRIX.md`  
**单测：** `insight-studio` `tests/unit/ai` + `tests/unit/steps` → **178 passed**  
**Python worker：** `tests/test_executor.py` → **7 passed, 1 skipped**  
**mock e2e：** `tests/e2e/ai.spec.ts` → **6 passed**  
**真实模型：** 探测 `/api/ai/chat` → **当日 TPD 已尽**（current ≈ 1.50M / limit 1.50M），短场景未再打模型。

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

## C. 真实模型短场景

探测正文（已脱敏）：`request reached organization TPD rate limit, current: 1500478, limit: 1500000`。

因此 **filter-chart / join / analysis-worker / skill-worker 四条未跑**。覆盖由 A+B 承担；生命周期长跑仍见 `AUDIT.md`（修后 Filter 已通，随后同样被 RPM/TPD 打断）。

配额恢复后执行：

```bash
DISPLAY=:1 node docs/dev/ai-agent-lifecycle-test/run-capability-live.mjs
```

---

## 对话 UX（结合 A/B/长跑）

| 项 | 结论 |
| --- | --- |
| 计划/轨迹/产物/确认/提问 | mock e2e 覆盖；确认卡已挪到 `ai-pending-actions` |
| 中止后续跑 | mock e2e 覆盖；产品保留 incomplete +「继续任务」 |
| TPD/配额文案 + 不自动空转重试 | 单测 + mock e2e；实跑探测仍是 502+TPD |
| 主区打开大表 | mock 建图会关抽屉进视图；长跑里 agent 很少主动打开表 |
| 子代理实选工具 | 仅长跑里见过工程师；规划师/分析师/MCP 本轮有 mock loop，无真实模型 |

---

## 还没被真实模型选过的能力

join / union / hide / report / dashboard / 规划师 / 分析师 / MCP 专家：工具实现与 UI 编排已测，**模型是否会主动选它们**要等 TPD 恢复后的 `run-capability-live.mjs`。
