# Insight DSH — DeepSeek Harness agent 平面

保留现有 AiDrawer；agent loop 与平台工具在本进程执行，分析文档仍由 `insight-api-go` 持久化。

```sh
# 需已启动 Go API（:8787）与 MariaDB
cd insight-dsh
npm install
export INSIGHT_API_ORIGIN=http://127.0.0.1:8787
export INSIGHT_SQL_ORIGIN=http://127.0.0.1:7120
# 与设置页一致：OpenAI 兼容端点（含阿里云 Qwen / DeepSeek 官方）
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export DEEPSEEK_API_KEY=sk-...
npm start   # http://127.0.0.1:3081
```

前端 Vite 把 `/api/ai/agent` 代理到本服务。

e2e / 无模型联调：

```sh
export INSIGHT_DSH_MOCK=1
npm start
```

此时不 boot DeepSeek Harness，按用户文案脚本执行真实平台工具。
