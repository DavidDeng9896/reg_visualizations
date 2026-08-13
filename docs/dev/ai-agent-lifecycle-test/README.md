# AI Agent 数据生命周期测试协议

已确认口径。P0（端口对齐 + 502 退避）已落地并按原计划复测，结果见 `AUDIT.md` §9。

| 项 | 值 |
| --- | --- |
| 测法 | 真实 UI 对话（方案 1） |
| 业务轮次 | r1 单点 aism + r2 组合 aicm |
| 过千行 | 落在 r1 算法打分宽表，由 agent 用工具自行生成 |
| 证据 | 产品思考/计划/轨迹/会话 + 本目录独立审计 |
| 模型 | kimi-k2.6 @ https://api.moonshot.cn/v1 |
| 项目 | hlx69，达标阈值 10× Kd vs WT |

- `hai-club-data-lifecycle.md`：对话附件参考文档
- `r1-prompt.md` / `r2-prompt.md`：两轮用户指令
- `snapshot_conversations.py`：会话快照采集（输出在 `audit-snapshots/`，不入库）
- `CAPABILITY-MATRIX.md`：主 agent / 子代理 / 流程图节点 / 对话 UX 分层测试协议
- `CAPABILITY-RESULTS.md`：本轮矩阵实测结论
- `AUDIT.md`：修前审计 + P0 修复后复测
- `evidence/`：关键截图（`post-fix-*` 为复测）
- `r1-traces-compact.json`：修前 r1 工具轨迹（无 Key）
- `post-fix-traces-compact.json`：复测 r1/r2 工具轨迹（无 Key）
