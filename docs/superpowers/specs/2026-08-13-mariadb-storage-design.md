# MariaDB 作为应用库与外部导入方言

> 状态：已拍板（方案 1）  
> 分支：`change_database`  
> 范围：`insight-api-go` 运行时存储、sqlite 一次性迁移、前端 SQL 导入方言

## 问题

应用数据现在落在 SQLite（`insight-api-go`），生产规划是 PostgreSQL。外部 SQL 导入只列出 PostgreSQL / MySQL。产品要：

1. 后端自用 **MariaDB**（本地开发也用真库，不用 SQLite）。
2. 外部导入 **明确支持 MariaDB**。
3. Electron 只做客户端，始终连 Go API → MariaDB，不内嵌数据库。

## 非目标

- 不改 Node `insight-api`（已弃用）。
- Skills / MCP / AI 配置仍走 `data/` 文件。
- 不把密码写入 Analysis 文档。
- 不做 ORM。
- Playwright e2e 仍启动 Node 原型时，其 sqlite 路径保持原样（该套 e2e 不依赖 Go 库）。

## 架构

```
Web / 以后的 Electron
        │  HTTP /api
        ▼
insight-api-go（:8787）
        │  github.com/go-sql-driver/mysql
        ▼
MariaDB 11.x（兼容 10.11+）
  ├─ 默认：docker compose（本机，缓冲池 128MB，端口 3306）
  └─ 或：INSIGHT_DB_* / INSIGHT_DB_DSN 指向已有实例
```

SQLite 只出现在一次性命令 `go run ./cmd/migrate-sqlite`。服务进程不再打开 `.sqlite` 文件。

## 连接配置

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `INSIGHT_DB_DSN` | 空 | 若设置则整段 DSN 优先 |
| `INSIGHT_DB_HOST` | `127.0.0.1` | |
| `INSIGHT_DB_PORT` | `3306` | |
| `INSIGHT_DB_USER` | `insight` | |
| `INSIGHT_DB_PASSWORD` | `insight` | |
| `INSIGHT_DB_NAME` | `insight` | |
| `INSIGHT_DATA_DIR` | `data` | Skills/MCP/ai-config 文件目录（不再从 sqlite 路径推导） |
| `INSIGHT_DB_PATH` | — | **服务忽略**。迁移命令默认源文件 `data/insight.sqlite` |

DSN 使用 `parseTime=true`、`charset=utf8mb4`、`loc=UTC`、`maxAllowedPacket=64MB`。

## Schema

表与现有 SQLite / 原 PG 规划对齐，方言换成 MariaDB：

- 主键 UUID → `CHAR(36)`
- 文档 / 列 / 行 → `JSON`
- 时间戳保持 **ISO-8601 字符串**（`VARCHAR(32)`），避免 DATETIME 扫描改变 API 形状
- `event_outbox.id` → `BIGINT AUTO_INCREMENT`
- 表快照行数据列名为 `row_data`（避免 MariaDB 保留字 `rows`）

启动时 `CREATE TABLE IF NOT EXISTS`（与 docker init 脚本同一份 `internal/store/schema.sql`）。

`data_sources` 建表预留，当前 store 仍可不写。

## sqlite → MariaDB 迁移

命令：`go run ./cmd/migrate-sqlite [--from data/insight.sqlite]`

- 读 sqlite：`analyses` / `dashboards` / `table_snapshots` / `event_outbox` / `ai_conversations`
- 写入 MariaDB，按主键 upsert，可重复执行
- 不删 sqlite 文件

## 外部导入

`SqlDialect` 增加 `'mariadb'`。默认端口 3306，驱动复用 `mysql2`（与 `mysql` 同一条 `withMysql`）。UI 下拉单独显示「MariaDB」。PostgreSQL / MySQL 选项保留。

## 测试

Go 测试连真实 MariaDB：每个测试 `CREATE DATABASE insight_test_<unique>`，结束时 `DROP`。连不上则失败并提示先 `docker compose up -d`。

前端：`defaultProfile({ dialect: 'mariadb' })` 端口为 3306。

## 成功标准

1. `go test ./...` 在 MariaDB 可用时通过。
2. 不设 `INSIGHT_DB_PATH` 也能启动 Go 服务并读写 Analysis。
3. `/health` 的 `storage` 为 `mariadb`。
4. SQL 导入对话框可选 MariaDB 并走现有 `/api/sql/*`。
5. 有 sqlite 文件时，迁移命令能把文档与会话导入 MariaDB。
