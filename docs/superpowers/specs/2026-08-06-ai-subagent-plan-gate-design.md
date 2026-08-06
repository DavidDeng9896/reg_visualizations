# Design: AI 计划闭环 + Subagent Workers（防中途假结束）

**日期：** 2026-08-06  
**状态：** 已确认，实现中  
**范围：** insight-studio agent-loop / aiStore / 工具注册；不改 MCP/Skill 后端协议  

## 1. 问题

产品分析 AI 在「查 Skill → 调 MCP → 改分析」等长链路中，常**做到一半直接结束**。根因叠加：

1. `submit_plan` / `mark_step_done` 存在，但模型可无工具收尾，**无强制闭环**  
2. Skill / MCP **长文本进主上下文**，触发压缩/截断后目标丢失  
3. **主循环既规划又执行**，复杂度高时易提前「总结」

## 2. 决策（用户确认）

| 点 | 结论 |
| --- | --- |
| 范围 | **P0 + P1 一起** |
| 续跑 | **C**：会话内自动续 + 输入框「继续任务」 |
| Workers | **全做**：skill / mcp / analysis / custom-code |
| 失败策略 | **尽量自处理**（重试/换工人）；删类确认仍可开 |

## 3. 架构

```
Planner（主 loop）
  ├─ submit_plan / mark_step_done（门禁）
  ├─ delegate_skill_worker(goal)
  ├─ delegate_mcp_worker(goal)
  ├─ delegate_analysis_worker(goal)
  ├─ delegate_code_worker(goal)
  └─ 少量只读工具（list_*）自行探路
Worker = 受限工具集 + 独立短 loop（maxIter 较小）+ 摘要回灌
```

## 4. P0 — 计划门禁与续跑

### 4.1 门禁

`runAgent` 内维护 `planSteps[]` / `planDone`：

- 模型返回**无 tool_calls** 且计划未完成 → 注入 system 催促并**继续下一轮**（最多 Nudge 次，默认 3）  
- Nudge 耗尽仍未完成 → `done` 但标记 `incomplete`；UI 显示「任务未完成」+「继续任务」  
- 超轮收尾同理：若计划未完成则 `incomplete`

### 4.2 工具结果预算

回灌 `tool` 消息前：`clipToolResult(summary, { soft: 2500, hard: 4000 })`  
Skill `read_skill` / MCP 调用结果优先摘要，避免主上下文被全文撑爆。

### 4.3 续跑

- **自动**：本轮 `send` 结束后若 `incomplete` 且非用户中止 → 自动 `continueTask` 一次（防死循环：同会话连续自动续 ≤ 2）  
- **手动**：输入条「继续任务」按钮（有未完成计划时可见）  
- `continueTask`：不新增用户气泡；注入 system「请从检查点继续完成剩余计划步骤…」再跑 loop

## 5. P1 — 四类 Worker

| 工具 | 允许子工具（示意） | 职责 |
| --- | --- | --- |
| `delegate_skill_worker` | list_skills, read_skill | 读 Skill 并提炼与 goal 相关的要点 |
| `delegate_mcp_worker` | 全部 mcp_* | 调 MCP，返回结构化摘要 |
| `delegate_analysis_worker` | 表/步骤/视图/图/看板写入类（不含 delete） | 执行分析加工与出图 |
| `delegate_code_worker` | list/schema + custom-code + run_step | 写/改 Custom Code 并自测 |

工人系统提示：只服务 `goal`；禁止提前宣称总任务完成；末轮输出「结论 + 关键产物 id」。

## 6. Prompt 变更

主 `SYSTEM_PROMPT` 增加：

- 复杂任务优先 `delegate_*_worker`，勿把 Skill/MCP 全文塞进主对话  
- 未 `mark_step_done` 完所有步骤前禁止结束  
- 工人失败时换策略或再派工人，勿静默收尾

## 7. 验收

- [x] 有计划未完成时，模型空收尾会被门禁拦住并续跑  
- [x] Skill/MCP 超长结果被裁剪，主上下文不再整篇灌入  
- [x] 四类 delegate 可调用且回摘要  
- [x] 「继续任务」可从 incomplete 检查点续跑；自动续不超过 2 次  
- [x] 相关单测通过  

## 8. 非目标

- 多工人并行抢同一 analysis 写锁  
- 跨会话任务队列 UI  
- 用户自定义工人编排 DSL  
