# MiniMax-M2.7-highspeed 真机 AI 能力测试（2026-09-02）

**分支：** `main`（`a24bdd5`）  
**模型：** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1`  
**环境：** MariaDB + `insight-api-go:8787` + Vite `:7100` + Python Worker `:8091`  

---

## 1. 结论摘要

| 类别 | 结果 |
| --- | --- |
| 模型连通 / 配额 | 通过（probe 单次回复约 2.5s） |
| 能力矩阵 first（4 项） | **4/4 通过** |
| 能力矩阵 rest（4 项） | **4/4 通过** |
| 补充场景（工程师 / 提问 / 附件） | **3/3 通过** |
| **Custom Code 面板 AI + Worker 状态** | **2/4 通过，1 部分，1 部分**（见 §2.4） |
| MCP 专家子代理 | **未测**（本机未配置 MCP 服务器） |
| 危险删除确认 / 中止续跑 | **未单独跑**（mock e2e 已覆盖） |

**总体：** MiniMax 在 Insight Studio **主 agent 工具链**与 **Custom Code 内置 AI 生成**上可用。Python Worker **未连接/已连接**提示文案正确。主要体验问题仍为 **思考内容泄漏到正文**（主 agent 与 Custom Code AI 均受影响），以及 **全局 AI 抽屉遮挡 Custom Code 面板操作**、**Custom Code 保存后执行结果与错误状态不同步**。

---

## 2. 测试明细

### 2.1 能力矩阵 first（`run-capability-live.mjs`）

| ID | 场景 | 结果 | 耗时量级 | 备注 |
| --- | --- | --- | --- | --- |
| filter-chart | CSV → Filter → bar 图 | ok | ~17–22s | 产物 `demo_hits` + `Filter table` + bar 视图 |
| join | left/right → inner join | ok* | ~17–19s | *断言通过，但 Join 产出数据有误（见体验 §3.2） |
| analysis-worker | 分析师子代理出 bar 图 | ok | ~20s | `iris_tiny` + bar 视图 |
| skill-worker | 规划师列 skill 要点 | ok | ~24s | 正确列出 6 个官方 skill 摘要 |

### 2.2 能力矩阵 rest（`LIVE_SCENES=rest`）

| ID | 场景 | 结果 | 备注 |
| --- | --- | --- | --- |
| union | u1+u2 → union | ok | 4 行合并表正确 |
| hide | wide → 隐藏 dropme | ok | `Hide columns` 剩 id/keep |
| report | create_report_step | ok | 流程图节点「短跑报告」 |
| dashboard | create_dashboard + widget | ok | 看板「短跑看板」已创建 |

### 2.3 补充（`run-minimax-extra.mjs`）

| ID | 场景 | 结果 | 备注 |
| --- | --- | --- | --- |
| code-worker | 工程师 + Custom Code 翻倍列 | ok | `nums` + `doubled` + custom-code 步骤 |
| ask-user | ask_user 提问卡 | ok | bar/line 选项卡正常弹出 |
| attachment-csv | 上传 CSV 附件 → import | ok | `att_demo` 表落地 |

### 2.4 Custom Code 面板 + Python Worker（`run-minimax-custom-code.mjs`）

| ID | 场景 | 结果 | 备注 |
| --- | --- | --- | --- |
| worker-disconnected | `/api/python/health` 不可达时面板提示 | **ok** | 文案：「Python Worker 未连接。请先启动 python-worker（./start.sh 会安装 rdkit）。」 |
| worker-connected | Worker 恢复后重新进入编辑 | **ok** | 黄条警告消失，可正常编辑 |
| ccp-ai-generate | 面板内「AI 助手」→ 生成 v2 列 → 应用 → 保存 | **partial** | ~4–7s 生成正确 `custom_code`；**保存后未产出 `doubled` 表**（步骤仍 failed / 错误残留，见 §3.6） |
| ccp-ai-fix-error | 故意 KeyError →「发送到 AI 修复」 | **partial** | AI 返回修复代码；自动化中保存后步骤仍有错误（与 §3.5 遮挡有关） |

**Custom Code AI 生成示例（MiniMax，约 4s）：** 能基于 `inputs[0]` 生成含 `df['v2'] = df['v'] * 2` 与 `IOData(name="doubled")` 的完整函数；但正文含 `<think>…</think>`（§3.1）。

原始 JSON：`capability-live.json`、`minimax-extra.json`、`minimax-custom-code.json`  
截图：`screenshots/cap-*.png`、`screenshots/extra-*.png`、`screenshots/ccp-*.png`

---

## 3. 体验问题记录（按优先级）

### P0 — 思考过程泄漏到用户可见正文（主 agent + Custom Code AI）

**现象：** MiniMax 把推理写在 `content` 的 ``，而不是 `reasoning_content`。`readSseStream` 只认后者，导致思考块出现在助手气泡与 Custom Code AI 对话区。

**影响：** 主 agent 与 **Custom Code 内置 AI** 均受影响；Custom Code 场景下还会多出一组无效的「应用 / 插入到光标」按钮（thinking 块被误解析为代码块）。

**建议：** 在 `contentScrub.ts` 剥离 `<think>…</think>`，并映射到 `ReasoningCard`（Custom Code AI 已用 `ReasoningCard`，但无 reasoning 字段时仍泄漏）。

---

### P1 — 同一分析多表时 Join 易连错表

（同前次测试，见 capability-live join 场景。）

**建议：** 每场景独立分析；Join 工具强制 `leftTableId`/`rightTableId`。

---

### P2 — ask_user 等待时仍显示「正在生成…」

（同前次测试。）

---

### P2 — 全局 AI 抽屉（docked）遮挡 Custom Code 面板底部

**现象：** 流程图编辑 Custom Code 时，若全局 AI 抽屉处于 **docked + open**，其层叠在面板之上，导致 **「保存」**、**「发送到 AI 修复」** 等按钮点击被拦截（Playwright 报 `ai-drawer__body intercepts pointer events`）。

**建议：** Custom Code 编辑态自动收起/最小化全局抽屉，或提高步骤面板 z-index；docked 模式不应盖住同屏步骤编辑器。

---

### P2 — Custom Code 创建时 Worker 不可用，错误状态易残留

**现象：** 从表拖线新建 Custom Code 且 Worker 不可达时，步骤先 auto-run 失败；Worker 恢复并 **应用 AI 代码 + 保存** 后，API 中 `config.code` 已有内容，但 `step.error` 仍可能显示「请先编写 custom_code 函数」，且未产出输出表。

**建议：** 保存时强制 `runStepAsync` 并清除陈旧 `step.error`；Worker 从不可达变为可达时面板应 **主动 refresh**（目前仅 `onMounted` 检查一次，需重新进入编辑才刷新 — 已验证重进有效）。

---

### P2 — 轨迹列表偶发重复 / 多余操作

（同前次 union 场景。）

---

### P3 — 附件导入后用户气泡显示临时文件名

（同前次 `_tmp_*.csv`。）

---

### P3 — Worker 未连接时无「一键安装」按钮

**现象：** `workerHealth.unreachable` 时只显示启动文案，**不展示**「一键安装白名单包」（该按钮仅在 `missing` 包场景出现）。与预期一致，但用户可能误以为 Worker 进程起来后科学包就一定齐全。

**建议：** unreachable 文案可补充「启动后若缺包会提示一键安装」。

---

### 信息 — MCP 专家未覆盖

本机无 MCP 配置，**delegate_mcp_worker** 未实跑。

---

## 4. 模型侧观察（非阻塞）

- 主 agent 工具调用稳定；工程师子代理 Custom Code 一次成功。
- Custom Code **面板 AI** 响应快（4–7s），代码质量可用（含正确 `custom_code` 签名与 pandas 逻辑）。
- 中英混排；总结偏 Markdown 表格。
- Python Worker 连通后 health 包列表完整（含 rdkit 2024.9.6）。

---

## 5. 复现命令

```bash
# 配置 Key（勿提交 ai-config.json）
curl -X PUT http://127.0.0.1:8787/api/ai/config -H 'Content-Type: application/json' -d '{"apiKey":"…","baseUrl":"https://api.minimaxi.com/v1","model":"MiniMax-M2.7-highspeed"}'

# Python Worker
cd python-worker && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8091

cd docs/dev/ai-agent-lifecycle-test
INSIGHT_ORIGIN=http://127.0.0.1:7100 node run-capability-live.mjs
LIVE_SCENES=rest INSIGHT_ORIGIN=http://127.0.0.1:7100 node run-capability-live.mjs
INSIGHT_ORIGIN=http://127.0.0.1:7100 node run-minimax-extra.mjs
INSIGHT_ORIGIN=http://127.0.0.1:7100 node run-minimax-custom-code.mjs
```

---

## 6. 建议后续

1. **合并 redacted_thinking 剥离**（主 agent + Custom Code SSE 共用）。
2. Custom Code 编辑态与 **全局 AI 抽屉** 互斥或分层修复。
3. 保存 Custom Code 时 **强制重跑** 并清除 stale error。
4. Join / 能力矩阵改为 **每场景独立分析**。
5. 配置 MCP 后补跑 **delegate_mcp_worker**。
