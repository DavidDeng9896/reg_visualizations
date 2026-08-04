# Insight API (Go)

高性能长期存储服务：Analysis / Dashboard 文档 + 表数据内容（列 + 行）。

> **默认后端**。Node 原型见 `../insight-api`（legacy，仅作对照）。

## 技术选型

| 项 | 选择 |
| --- | --- |
| 语言 | **Go 1.22+** |
| 本地开发库 | SQLite（`modernc.org/sqlite`，纯 Go） |
| 生产库 | PostgreSQL（`migrations/001_init.pg.sql`） |
| 协议 | REST（兼容前端 `HttpAnalysisRepository`） |

产品规则：**只存数据内容，不存导入原始文件**。

## 运行

```bash
cd insight-api-go
go run ./cmd/server          # http://127.0.0.1:8787
# 或
PORT=8787 INSIGHT_DB_PATH=./data/insight.sqlite go run ./cmd/server
```

前端：

```bash
# insight-studio/.env.development 已设 VITE_API_BASE_URL=
# Vite 代理 /api、/health → :8787
cd insight-studio && yarn dev
```

PostgreSQL（生产 schema）：

```bash
docker compose up -d
```

## API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查（`runtime: go`） |
| GET/PUT/DELETE | `/api/analyses/:id` | Analysis 文档（含表数据内容） |
| GET | `/api/analyses/:id/tables/:tableId/snapshot` | 最新数据内容快照 |
| GET/PUT/DELETE | `/api/dashboards/:id` | 看板 |
| GET/PUT | `/api/ai/config` | AI 配置（apiKey 仅回掩码） |
| POST | `/api/ai/chat` | OpenAI 兼容 SSE 代理 |
| GET/POST | `/api/ai/conversations` | 会话列表 / 新建 |
| GET/PUT/DELETE | `/api/ai/conversations/:id` | 会话读写删 |

`PUT /api/analyses/:id` 事务写入 `analyses` + `table_snapshots` + `event_outbox`。  
可选头 `If-Match: <revision>` 乐观锁。

## 测试

```bash
go test ./...
```

## 后续（高性能路线）

- PG 驱动替换 SQLite（同一 store 接口）
- SSE `/events` + outbox publisher
- 独立 `rerun-worker` 跑 flowchart DAG
- 大表 rows → 对象存储 / Parquet
