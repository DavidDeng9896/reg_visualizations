# Insight DSH — DeepSeek Harness agent 平面

保留现有 AiDrawer；agent loop 与平台工具在本进程执行，分析文档仍由 `insight-api-go` 持久化。

```sh
# 需已启动 Go API（:8787）与 MariaDB（无库时可用 Node insight-api）
cd insight-dsh
npm install
export INSIGHT_API_ORIGIN=http://127.0.0.1:8787
export INSIGHT_SQL_ORIGIN=http://127.0.0.1:7120
# 与设置页一致：OpenAI 兼容端点（含阿里云 Qwen / DeepSeek 官方）
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export DEEPSEEK_API_KEY=sk-...
# 可选：覆盖默认模型。阿里云 Qwen 兼容端会自动 DSH_THINKING=disabled
# （其不接受 DeepSeek 的 reasoning_effort=max）。
export DSH_MODEL=qwen3.6-flash
npm start   # http://127.0.0.1:3081
```

前端 Vite 把 `/api/ai/agent` 代理到本服务。

真实模型场景扫描：

```sh
# 假定 api :8787、dsh :3081 已用真实 key 启动（不要 INSIGHT_DSH_MOCK）
DSH_MODEL=qwen3.6-flash node scripts/live-harness.mjs
```

e2e / 无模型联调：

```sh
export INSIGHT_DSH_MOCK=1
npm start
```

此时不 boot DeepSeek Harness，按用户文案脚本执行真实平台工具。
