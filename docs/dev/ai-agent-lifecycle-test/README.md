# AI Agent 数据生命周期测试协议

已确认口径（执行中，确认分析报告前不改代码）。

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
- `AUDIT.md`：r1 实测问题与效率分析（确认前不修代码）
- `evidence/`：关键截图
- `r1-traces-compact.json`：正式 r1 工具轨迹（无 Key）
