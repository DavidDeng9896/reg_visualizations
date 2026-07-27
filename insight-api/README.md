# Insight API

长期保存 Insight 数据内容（列 + 行）的服务端。

## 存储

- 开发默认：**SQLite**（`data/insight.sqlite`），表结构对齐 PostgreSQL
- 生产：使用 `migrations/001_init.pg.sql` 建 **PostgreSQL** 库（不存导入原始文件）

## 运行

```bash
cd insight-api
npm install
npm run dev   # http://127.0.0.1:8787
```

## 主要 API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET/PUT/DELETE | `/api/analyses/:id` | Analysis 文档（含表数据内容） |
| GET | `/api/analyses/:id/tables/:tableId/snapshot` | 最新数据内容快照 |
| GET/PUT/DELETE | `/api/dashboards/:id` | 看板 |

`PUT /api/analyses/:id` 会写入 `analyses` + 各表 `table_snapshots`，并追加 `event_outbox`（`analysis.updated`）。
可选头 `If-Match: <revision>` 做乐观锁。

## 前端切换

```bash
# insight-studio
VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```
