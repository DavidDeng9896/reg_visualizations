# Insight Analysis / reg_visualizations

科学数据工作空间：导入表格数据、步骤流程图、图表与看板。

## 应用

| 目录 | 说明 |
| --- | --- |
| [`insight-studio/`](./insight-studio/) | 前端（Vue 3 + Vite :7100） |
| [`insight-api-go/`](./insight-api-go/) | **默认后端**（Go，:8787；含 AI Skills / MCP / 记忆） |
| [`insight-api/`](./insight-api/) | Node legacy（已弃用，勿与 Go 同时占 :8787） |
| [`python-worker/`](./python-worker/) | Custom Code Python Worker（:8091） |

## 快速开始

```bash
# 终端 1：Go API（默认后端；Skills/MCP 等 AI 能力依赖此服务）
cd insight-api-go && go run ./cmd/server   # :8787

# 终端 2：前端（Vite 把 /api 代理到 :8787）
cd insight-studio && npm install && npm run dev   # :7100

# 可选：Custom Code
cd python-worker && npm start   # :8091
```

> 若误启 Node `insight-api` 占用 :8787，设置里点 Skills 会出现连续 404。请停掉 Node，改用 `insight-api-go`。

不设 `VITE_API_BASE_URL` 时分析数据可回退到浏览器 IndexedDB（Dexie）；**AI 能力仍需 Go API**。

```bash
cd insight-studio && npm test && npm run build
cd insight-api-go && go test ./...
```

## 文档

全部文档在 [`docs/`](./docs/README.md)。数据长期保存与 flowchart 同步见  
[`docs/specs/2026-07-27-data-persistence-realtime-design.md`](./docs/specs/2026-07-27-data-persistence-realtime-design.md)。

## 技术栈

Vue3 · Vite · TypeScript · Pinia · vxe-table · Vue Flow · Plotly · Dexie · Go · SQLite/PostgreSQL
