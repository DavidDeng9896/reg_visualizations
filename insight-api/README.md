# Insight API (Node legacy)

> **已弃用为默认后端。** 请使用 **`../insight-api-go`（Go）**。
>
> 本目录保留 Hono + better-sqlite3 原型，便于对照契约；新功能只合入 Go 服务。

长期保存 Insight 数据内容（列 + 行）的服务端（历史实现）。

## 存储

- 开发默认：**SQLite**（`data/insight.sqlite`），表结构对齐 PostgreSQL
- 生产：使用 `migrations/001_init.pg.sql` 建 **PostgreSQL** 库（不存导入原始文件）

## 运行（仅调试旧实现）

```bash
cd insight-api
npm install
npm run dev   # http://127.0.0.1:8787 — 勿与 insight-api-go 同时占端口
```

## 主要 API

与 `insight-api-go` 相同；见该目录 README。
