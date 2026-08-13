# Insight API (Go)

高性能长期存储服务：Analysis / Dashboard 文档 + 表数据内容（列 + 行）。

> **默认后端**。Node 原型见 `../insight-api`（legacy，仅作对照）。

## 技术选型

| 项 | 选择 |
| --- | --- |
| 语言 | **Go 1.22+** |
| 数据库 | **MariaDB**（`github.com/go-sql-driver/mysql`） |
| Schema | `internal/store/schema.sql` |
| 协议 | REST（兼容前端 `HttpAnalysisRepository`） |

产品规则：**只存数据内容，不存导入原始文件**。

Skills / MCP / AI 配置仍在 `INSIGHT_DATA_DIR`（默认 `data/`）的文件里，不进 MariaDB。

## 运行

先起 MariaDB（默认账号 `insight` / `insight`，库 `insight`，端口 3306，缓冲池 128MB）：

```bash
cd insight-api-go
docker compose up -d
```

或用环境变量连已有实例：

```bash
export INSIGHT_DB_HOST=127.0.0.1
export INSIGHT_DB_PORT=3306
export INSIGHT_DB_USER=insight
export INSIGHT_DB_PASSWORD=insight
export INSIGHT_DB_NAME=insight
# 也可直接：
# export INSIGHT_DB_DSN='insight:insight@tcp(127.0.0.1:3306)/insight'
```

```bash
cd insight-api-go
go run ./cmd/server          # http://127.0.0.1:8787
```

从旧 SQLite 迁一次（不删源文件，可重复执行）：

```bash
go run ./cmd/migrate-sqlite --from data/insight.sqlite
```

前端：

```bash
# insight-studio/.env.development 已设 VITE_API_BASE_URL=
# Vite 代理 /api、/health → :8787
cd insight-studio && yarn dev
```

### Custom Code 需要 Python Worker（:8091）

流程图 Custom Code 步骤会经本服务代理到 `PYTHON_WORKER_URL`（默认 `http://127.0.0.1:8091`）。  
**必须另开终端启动 worker**，否则会出现 `python worker unreachable` / Windows `connectex`：

```bat
REM Windows
cd python-worker
start.cmd
```

```bash
# macOS / Linux
cd python-worker && ./start.sh
# 或
cd python-worker && npm run install-deps && npm start
```

健康检查：`http://127.0.0.1:8091/health` → `{"ok":true}`

## API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查（`runtime: go`，`storage: mariadb`） |
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

需要本机可连的 MariaDB（同上 `docker compose up -d` 或 `INSIGHT_DB_*`）。每个测试会建独立 `insight_test_*` 库并在结束后删除。

```bash
go test ./...
```

## 后续（高性能路线）

- SSE `/events` + outbox publisher
- 独立 `rerun-worker` 跑 flowchart DAG
- 大表 rows → 对象存储 / Parquet
