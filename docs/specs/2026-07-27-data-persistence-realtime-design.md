# 数据长期保存、外部动态源与 Flowchart 实时更新

> 状态：设计规格（待评审）  
> 范围：`insight-studio` 数据内容入库、服务端数据库、改数驱动 flowchart 全链路同步、外部动态源  
> 关联：`DESIGN.md` Repository 抽象、Dashboard P2（revision / SSE）、`modules/steps/rerun.ts`  
>
> ### 产品拍板（2026-07-27）
> 1. **不保存导入的原始文件**（CSV/Excel 字节用完即弃）。  
> 2. **必须保存导入后的数据内容**（列 + 行）到数据库，保证长期可调用、不遗失。  
> 3. **数据内容一旦变更**（手工改表 / 外部源刷新），**整条 flowchart 下游必须同步更新**（标 stale 并自动重跑物化）。

## 1. 问题与目标

### 1.1 现状缺口

| 能力 | 现状 | 风险 |
| --- | --- | --- |
| **服务端数据库** | **无**；仅浏览器 IndexedDB（Dexie） | 数据随浏览器配置消亡；无法跨设备、无法被其他系统调用 |
| 长期保存 | Dexie 整份 `Analysis` JSON（含全部行）写 IndexedDB | 清浏览器 / 换机 / IDB 配额 → 数据丢失；大表整文档覆盖成本高 |
| 导入数据内容 | 解析后的行仅在浏览器 Dexie；无服务端库 | 清缓存即丢；无法跨设备调用 |
| 外部动态源 | Registry / Plate / Connect external 仅为 UI 占位 | 无法对接后续仪器、中台、API |
| 实时更新 | 仅本 Tab Pinia 响应；无 revision / SSE | 外部数据变了，flowchart 与看板不会自动变 stale / 重算 |

### 1.2 目标（验收口径）

1. **只存数据内容，不存原始文件**：导入解析成功后，列/行写入数据库；原始 File/Blob 不落库、不进对象存储。
2. **入库即真相源**：数据内容写入 **PostgreSQL**；浏览器 IDB 仅缓存；清浏览器不得导致永久丢失。
3. **可长期调用**：Analysis / 表数据快照有稳定 UUID；HTTP API 按 ID 读取。
4. **改数 → 全链路同步**（硬需求）：任意数据内容变更后，下游步骤自动 stale **并自动重跑**，flowchart / 工作区表与图 / Dashboard 一起更新。
5. **动态源可插拔**：外部源变更同样写入数据内容新版本，走同一条「改数 → 全链路同步」路径。

### 1.3 非目标

- **不保存**导入原始文件（无 file blob / 对象存储导入路径）
- 多租户权限与审计 UI
- Python Custom Code 沙箱
- 跨组织联邦查询引擎

---

## 2. 总体架构：双层存储（文档 + 数据内容）+ 事件总线

```
┌─────────────────────────────────────────────────────────────┐
│  UI：Workspace / Flowchart / Dashboard                       │
│       改单元格 / 外部刷新 → mutate → 自动重跑下游            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Domain：Analysis 文档（步骤图）+ Step exec / Pipeline       │
│           数据内容变更 → mark stale → auto rerun DAG         │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
        ┌─────▼─────┐               ┌─────▼──────┐
        │ Document  │               │ Data Content│
        │ 步骤/配置 │               │ 列 + 行    │
        │ 布局/绑定 │               │ dataVersion │
        └─────┬─────┘               └─────┬──────┘
              │                           │
              └─────────────┬─────────────┘
                            │ Repository → HTTP
┌───────────────────────────▼─────────────────────────────────┐
│  PostgreSQL：analyses + table_snapshots + event_outbox       │
│  （不存原始导入文件）                                         │
│  SSE：data.changed | analysis.updated | step.*               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Connectors：http-poll | webhook | registry | plate …        │
└─────────────────────────────────────────────────────────────┘
```

**分层原则（已按产品拍板）**

| 层 | 存什么 | 服务端落点 | 明确不存 |
| --- | --- | --- | --- |
| **Document** | 步骤图、视图配置、布局、表 meta、源绑定 | `analyses` / `dashboards` JSONB | 原始文件；大表行（演进后） |
| **Data Content** | 导入/编辑/外部同步后的 **列 + 行** | `table_snapshots` | CSV/XLSX 原始字节 |

> 原「Blob / 对象存储保存导入文件」方案 **撤销**。导入只是把文件解析成表内容的临时手段。

---

## 3. 数据模型扩展

### 3.1 修订与版本

```ts
interface Analysis {
  // …现有字段
  /** 单调递增；每次成功 mutate 落盘 +1。Dashboard / 多端以此失效缓存。 */
  revision: number
  /** 绑定的外部数据源（可空）。 */
  dataSources?: DataSourceBinding[]
}

interface AnalysisTable {
  // …现有字段
  /** 指向 Snapshot Store；缺省 = 行仍内联在 rows（兼容旧数据）。 */
  snapshotRef?: string
  /** 产出该表快照时的数据版本（源侧或上游步骤）。 */
  dataVersion?: string
  /** 快照物化时间。 */
  materializedAt?: string
}
```

### 3.2 导入：只落数据内容（不落文件）

```
用户选择 CSV/Excel
  → 浏览器内存解析（papaparse / xlsx）
  → 得到 columns + rows
  → 丢弃 File/Blob（不上传、不进 DB、不进对象存储）
  → 事务写入：源步骤 + AnalysisTable meta + table_snapshots（数据内容）
  → revision++
```

可选元数据（仅便于 UI 展示，非文件本体）：

```ts
interface ImportProvenance {
  originalName?: string   // 如 "assay.csv"，仅显示用
  importedAt: string
  rowCount: number
}
```

**导入事务（必须原子）**

1. 解析得到 `columns` + `rows`（内存）
2. 写 `table_snapshots`（数据内容）
3. 写源步骤 + 表 meta（`snapshotId` / `dataVersion`）
4. `revision++`
5. 失败整单回滚——**禁止出现「步骤有了、数据内容没了」**

### 3.3 外部数据源绑定

```ts
type DataSourceKind =
  | 'upload'          // 本地文件（静态）
  | 'http-dataset'    // REST/JSON/CSV URL
  | 'registry'        // 占位：实体库
  | 'plate'           // 占位：板读数
  | 'webhook-push'    // 外部推送写入本系统快照
  | 'sql-gateway'     // 远端 SQL（非 alasql 本地）

interface DataSourceBinding {
  id: string
  kind: DataSourceKind
  name: string
  /** Connector 专属配置（URL、鉴权引用、轮询间隔、映射…）。 */
  config: Record<string, unknown>
  /** 最近一次成功拉取的版本（etag / 业务 version / 内容 hash）。 */
  lastDataVersion?: string
  lastSyncedAt?: string
  status: 'idle' | 'syncing' | 'error' | 'stale'
  error?: string
  /** 该源物化到哪个源步骤 / 输出表。 */
  stepId: string
  tableId?: string
}

interface DataSourceEvent {
  sourceId: string
  dataVersion: string
  changedAt: string
  /** 可选：增量补丁；缺省全量替换快照。 */
  mode: 'full' | 'incremental'
}
```

源步骤扩展（与现有 `StepType` 并存）：

| StepType（建议） | 含义 |
| --- | --- |
| `upload-csv` / `upload-xlsx` | 解析后写入数据内容（不保留文件） |
| `connect-external` | 绑定外部源，输出表 = 数据内容快照 |
| `query-sql` / `join` / … | 基于上游表内容物化新快照 |

`connect-external` 的 `config` 仅存 `dataSourceId`；连接细节在 `Analysis.dataSources[]`。

---

## 4. Repository 与长期调用

### 4.1 接口演进（保持可替换）

在现有 `AnalysisRepository` 之上拆出能力，避免「整份 Analysis 塞百万行」成为唯一路径：

```ts
interface AnalysisDocumentRepository {
  list(): Promise<AnalysisSummary[]>
  get(id: string): Promise<Analysis | undefined>
  put(analysis: Analysis): Promise<void>   // Document；大行走 Snapshot
  delete(id: string): Promise<void>
}

interface SnapshotRepository {
  get(ref: string): Promise<TableSnapshot | undefined>
  put(snapshot: TableSnapshot): Promise<void>
  delete(ref: string): Promise<void>
}

interface TableSnapshot {
  id: string
  analysisId: string
  tableId: string
  dataVersion: string
  columns: ColumnMeta[]
  rows: Row[]          // 数据内容本体
  createdAt: string
}
```

**调用约定**

- UI / Store 只依赖接口，不直接碰 Dexie / SQL。
- **无 BlobRepository**：不实现「保存原始导入文件」。
- 生产真相源：**PostgreSQL**（Document + Data Content）；HTTP Repository 对接 API。

### 4.2 导出 / 备份

1. 服务端 PG 为主备份面。
2. 过渡期：`.insight` zip = `analysis.json` + `snapshots/*`（**不含**原始文件）。
3. 冲突策略：`revision` 乐观锁（If-Match）。

---

## 5. 服务端数据库设计（核心）

> IndexedDB **不是**长期数据库，只是客户端缓存。  
> **长期保存的真相源 = PostgreSQL（存数据内容，不存导入文件）。**

### 5.1 选型结论

| 组件 | 选型 | 理由 |
| --- | --- | --- |
| 主库 | **PostgreSQL 15+** | JSONB 存文档与表数据内容；事务/索引成熟；可被外部系统调用 |
| 超大快照（可选） | 对象存储仅用于「压缩后的行数据备份」 | **不是**导入原文件；仅当 JSONB 过大时的行转储 |
| 缓存（可选） | Redis | SSE 扇出、源轮询锁 |
| 本地开发 | Dexie 或 Docker Compose：PG |

**明确不做**：导入文件对象存储、`file_blobs` 存原始 CSV/XLSX。

**不采用**（本阶段）：纯 MongoDB；「一单元格一行」宽表。

### 5.2 逻辑库表

```sql
-- 分析文档（步骤图真相源；大行不在此）
CREATE TABLE analyses (
  id            UUID PRIMARY KEY,
  workspace_id  UUID NOT NULL,          -- 租户/项目；先单 workspace 也可
  name          TEXT NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 1,
  -- 瘦 Document：steps / tables meta / flowchart_layout / data_sources / files meta
  document      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ             -- 软删可选
);
CREATE INDEX analyses_workspace_updated ON analyses (workspace_id, updated_at DESC);

-- 看板（与 Analysis 平级）
CREATE TABLE dashboards (
  id            UUID PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  name          TEXT NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 1,
  document      JSONB NOT NULL,         -- layout + widgets
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- （不建 file_blobs：产品拍板不保存导入原始文件）

-- 表数据内容：导入结果 / 手工编辑 / 步骤物化 / 外部源同步
CREATE TABLE table_snapshots (
  id              UUID PRIMARY KEY,
  analysis_id     UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  table_id        UUID NOT NULL,        -- Document 内 AnalysisTable.id
  step_id         UUID,                 -- 产出该快照的步骤
  data_version    TEXT NOT NULL,        -- etag / hash / 业务版本
  columns         JSONB NOT NULL,       -- ColumnMeta[]
  -- 行数据：中小表直接 JSONB；超大表见 5.3
  rows            JSONB,                -- Row[]；与 row_storage 二选一
  row_storage     TEXT NOT NULL DEFAULT 'jsonb'
                    CHECK (row_storage IN ('jsonb', 'object', 'chunked')),
  object_key      TEXT,                 -- row_storage=object 时：压缩 JSON/Parquet
  row_count       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, table_id, data_version)
);
CREATE INDEX table_snapshots_latest ON table_snapshots (analysis_id, table_id, created_at DESC);

-- 外部数据源绑定（也可只放在 analyses.document.data_sources；独立表便于运维查询）
CREATE TABLE data_sources (
  id               UUID PRIMARY KEY,
  analysis_id      UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL,       -- upload | http-dataset | registry | …
  name             TEXT NOT NULL,
  config           JSONB NOT NULL,      -- 不含明文密钥；密钥走 secrets
  secret_ref       TEXT,
  last_data_version TEXT,
  last_synced_at   TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'idle',
  error            TEXT,
  step_id          UUID,
  table_id         UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX data_sources_analysis ON data_sources (analysis_id);

-- 密钥引用（不存明文到 analyses JSON）
CREATE TABLE secrets (
  id            UUID PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  name          TEXT NOT NULL,
  ciphertext    BYTEA NOT NULL,         -- KMS/应用层加密
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 事务外发事件（推 SSE / 下游重算）
CREATE TABLE event_outbox (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  event_type    TEXT NOT NULL,          -- analysis.updated | source.changed | …
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX event_outbox_pending ON event_outbox (created_at)
  WHERE published_at IS NULL;
```

Document JSONB 建议形状（与前端 `Analysis` 对齐，但去掉内联 `rows`）：

```json
{
  "steps": [],
  "tables": [{ "id": "…", "name": "…", "columns": [], "snapshotId": "…", "dataVersion": "…" }],
  "flowchartLayout": {},
  "dataSources": [{ "id": "…", "kind": "http-dataset", "stepId": "…" }],
  "importProvenance": { "assay": { "originalName": "assay.csv", "importedAt": "…" } }
}
```

> `Analysis.files` / `contentRef` 前端占位字段可保留兼容，但**服务端不落文件字节**。

### 5.3 行数据存哪：三级策略

| 规模 | `row_storage` | 做法 |
| --- | --- | --- |
| ≤ ~5 万行 / ~20MB | `jsonb` | `table_snapshots.rows` JSONB；读取简单 |
| 更大 | `object` | 行序列化 gzip/Parquet 写入对象存储；PG 只留 `object_key` + `row_count` + `columns` |
| 极大 / 需 SQL 分析（远期） | `chunked` 或外部仓 | 按 chunk 表或接入分析仓；本期不做 |

前端管道仍消费「列 + 行」数组；后端按策略拼装后经 API 返回（可分页：`?offset&limit`）。

### 5.4 写入事务（导入 / 改数 / 外部 sync）

**导入 CSV/Excel（只存数据内容）**

```
浏览器解析 File → columns + rows → 丢弃 File
BEGIN;
  INSERT table_snapshots (data_version, columns, rows…);  -- 数据内容
  UPDATE analyses
    SET document = …(tables.snapshotId / steps / provenance 文件名可选),
        revision = revision + 1,
        updated_at = now()
    WHERE id = $id AND revision = $expected;
  INSERT event_outbox ('analysis.updated');
COMMIT;
```

**手工改表（单元格 / 增删行）—— flowchart 必须同步**

```
writeBackCell / insertRow / deleteRow
  → 更新源表数据内容（新 snapshot 或原地更新 latest）
  → markTableEdited：下游步骤全部 status = stale
  → rerunStaleSteps：按拓扑序自动重跑（Filter/Join/…）
  → 每个下游步骤写出新 table_snapshots
  → analyses.revision++
  → event_outbox: data.changed { tableId, analysisId, revision }
  → SSE → 其他端 / Dashboard / Flowchart UI 刷新
```

> 现状：`DataGrid` 已调用 `markTableEdited`（仅标 stale），需升级为 **默认自动 `rerunStaleSteps`**，满足「改数后整条流同步变更」。

**外部源变更（同改数路径）**

```
Connector.sync → 新 rows + dataVersion
  → INSERT table_snapshots
  → markDownstreamStale + auto rerunStaleSteps
  → revision++ + outbox source.changed / data.changed
```

### 5.5 读取与「长期调用」

| 调用方 | API 示例 | 库访问 |
| --- | --- | --- |
| Insight 前端 | `GET /analyses/:id` | `analyses` + 按需 `table_snapshots` |
| 表格分页 | `GET /analyses/:id/tables/:tid/rows?offset&limit` | snapshot JSONB 切片或 object 流式 |
| 外部系统整合 | `GET /analyses/:id/export` 或只读 SQL 视图 | 导出的是**数据内容**，不是原文件 |
| Dashboard | `GET /dashboards/:id` + 批量 `analyses?ids=` | `dashboards` + snapshots |

所有稳定资源用 **UUID**；`revision` 用于缓存与并发控制（`ETag` / `If-Match`）。

### 5.6 与实时通道的关系

```
数据内容写入 / 下游重跑完成（同一业务事务或紧随事务）
  → event_outbox（data.changed / analysis.updated）
  → publisher → SSE
  → flowchart 节点状态与预览刷新；Dashboard widget 失效重算
```

禁止「只推事件不写库」或「只写库不推事件」。

### 5.7 Dexie → PostgreSQL 迁移路径

1. 前端继续 Dexie；「同步到服务器」：读本地 Analysis + 表数据内容 → 批量写入 PG。  
2. 切换默认 Repository 为 HTTP；Dexie 降级为离线队列。  
3. 旧本地-only 文档提示迁移；迁移成功后可清 IDB。

### 5.8 后端服务边界（建议）

```
insight-api
  ├── REST: analyses / dashboards / data-sources / snapshots（数据内容）
  ├── SSE:  /events
  ├── workers: connector poll、DAG auto-rerun、outbox publisher
  └── 依赖: PostgreSQL, (Redis)；无导入文件对象存储
```

语言不锁定；需提供 OpenAPI，与现有 `AnalysisRepository` 字段对齐。

---

## 6. 外部动态源与 Connector

### 6.1 Connector 契约

```ts
interface DataSourceConnector {
  kind: DataSourceKind
  /** 拉取或接收一次数据，返回新版本快照候选。 */
  sync(binding: DataSourceBinding, ctx: SyncContext): Promise<SyncResult>
  /** 可选：建立推送订阅（SSE/WebSocket/webhook 登记）。 */
  watch?(binding: DataSourceBinding, onEvent: (e: DataSourceEvent) => void): () => void
}

interface SyncResult {
  dataVersion: string
  columns: ColumnMeta[]
  rows: Row[]
  /** 若源同时给文件，写入 Blob。 */
  rawBlob?: Blob
}
```

### 6.2 同步策略

| 模式 | 适用 | 行为 |
| --- | --- | --- |
| **手动 Refresh** | 上传文件、偶发 API | 用户点「同步」或源节点 Rerun |
| **轮询** | 无 webhook 的 HTTP | `config.pollIntervalMs`，后台 sync |
| **推送** | 中台 webhook / 内部 SSE | `source.changed` → 自动 sync |
| **打开时刷新** | Dashboard / Analysis 获焦 | 对齐 Dashboard 设计 P2a |

### 6.3 变更如何进入 flowchart 数流

```
Connector sync 成功  （与手工改表同一条路径）
  → INSERT table_snapshots（新数据内容 + dataVersion）
  → 更新源表 meta
  → markDownstreamStale(stepId)
  → **自动** rerunStaleSteps（拓扑序重跑整条下游）
  → 下游每步写出新数据内容快照
  → revision++ + event_outbox
  → Flowchart / 工作区 / Dashboard 同步刷新
```

**实时性定义（产品拍板）**

- 数据内容变更后，**默认自动重跑整条下游**（不是只标 stale 等人点 Run）。
- 重跑可异步：节点先显示 running，完成后变 configured；预览随到随新。
- 仅在极端大图可提供「暂停自动重跑」开关；默认开启。

---

## 7. 事件总线与多端刷新

与 Dashboard 规格 P2b 对齐并扩展：

```ts
type InsightEvent =
  | { type: 'analysis.updated'; id: string; revision: number; reason?: string }
  | { type: 'source.changed'; analysisId: string; sourceId: string; dataVersion: string }
  | { type: 'dashboard.updated'; id: string; revision: number }
  | { type: 'step.progress'; analysisId: string; stepId: string; status: StepStatus }
```

| 阶段 | 传输 |
| --- | --- |
| 本地过渡 | `BroadcastChannel('insight-studio')` + 同 Tab Pinia |
| 服务端 | **DB outbox → SSE** `/events?analysisIds=`（或 WebSocket）；payload 同上 |
| Dashboard | 收 `analysis.updated` → 按 `(analysisId, tableId, viewId, revision)` 失效 widget 缓存 |

Flowchart 订阅同一频道：收到事件后若当前打开的 Analysis 匹配，则 `GET /analyses/:id`（或增量补丁），重建 graph（现有 `modules/flowchart/graph.ts`），保留 `flowchartLayout`。

---

## 8. 导入路径改造（防遗失）

### 8.1 目标路径

```
用户选择文件
  → 内存解析 → columns + rows → 丢弃 File
  → INSERT table_snapshots（数据内容）
  → 创建源 Step + AnalysisTable.snapshotId
  → revision++ + outbox
手工改表 / 外部 sync
  → 更新数据内容
  → markTableEdited / markDownstreamStale
  → 自动 rerunStaleSteps → 下游快照全更新
  → revision++ + outbox（flowchart 同步）
```

### 8.2 对现有入口的要求

| 入口 | 改造 |
| --- | --- |
| `commitImportedTable` | 增加可选 `file?: { blob, name, mime }`；有文件则先写 Blob |
| CSV / Excel Dialog | 保留原 File 对象直至事务成功；禁止只留 parsed rows |
| SQL（alasql） | 无外部文件：物化结果进 Snapshot，步骤 `query-sql` 的 config 保存查询文本（已有） |
| Combine / Join | 无新 Blob；依赖上游 snapshotId |
| Connect external | 每次 sync 写新 `table_snapshots` 行；可选保留历史 N 个版本便于回滚 |

### 8.3 删除与孤儿清理

- 删 Analysis：`ON DELETE CASCADE` 清 `table_snapshots` / `data_sources`。
- 删源步骤：删除其产出快照；下游标 stale 并自动重跑或提示断开。
- 若只保留 latest：定期 GC 旧 `data_version` 快照。

---

## 9. 与现有代码的落点

| 模块 | 路径 | 改动要点 |
| --- | --- | --- |
| 服务端 DB | 新建 `insight-api` + migration | `analyses` + `table_snapshots` + outbox（无 file_blobs） |
| Types | `shared/types.ts` | `revision`、`snapshotId`、`dataVersion` |
| Repository | `shared/repository.ts` | Document + Snapshot；`HttpAnalysisRepository` |
| Import | `commitImport.ts` | 只持久化数据内容 |
| 编辑联动 | `DataGrid.vue` + `rerun.ts` | `markTableEdited` 后 **自动** `rerunStaleSteps` |
| Flowchart | `modules/flowchart/*` | 订阅 SSE；改数后节点/预览自动更新 |
| Dashboard | `widgetData.ts` | `revision` / `dataVersion` 缓存失效 |
| Connect | Sidebar Connect | 外部 sync → 同编辑联动路径 |

---

## 10. 分阶段交付

### Phase A — 改数驱动全链路（可先本地）

1. 编辑表后：即时 `markTableEdited` + **200ms 防抖**后按成本自动 `rerunStaleSteps`  
2. 超 `AUTO_RERUN_BUDGET` 只标 stale，不卡主线程  
3. Flowchart / 工作区下游随重跑结果更新  
4. 单测：小图同步、防抖合并、超预算降级  

### Phase B — 数据内容入库语义

1. 导入只写数据内容（明确不写原始文件）  
2. Document / Snapshot 拆分（大表）  
3. `.insight` 导出含 snapshots，不含原文件  

### Phase C — 外部源

1. Connector sync → 写数据内容 → **同一套自动重跑**  
2. `connect-external` 步骤  

### Phase D — **PostgreSQL 上线**

1. 建库：`analyses` / `dashboards` / `table_snapshots` / `data_sources` / `event_outbox`（**无 file_blobs**）  
2. HTTP Repository 默认；Dexie 仅离线缓存  
3. outbox → SSE；跨端 flowchart 同步  
4. 验收：**清浏览器后数据内容仍在**；**改数后下游自动变**  

---

## 11. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| 只做前端 IDB、迟迟不上 PG | Phase D 硬门槛；清浏览器后数据内容仍在 |
| 改数只标 stale 不重跑 | 默认 auto rerun，但受 §14 性能闸门约束 |
| JSONB 大快照撑爆 PG | 超大表可转储压缩行；API 分页 |
| **改数全链路重跑打爆主线程 / DB** | **§14 性能策略（必做）** |
| 外部源 schema 漂移 | 列对齐报告；失败保留旧数据内容 |
| 密钥进库明文 | `secrets` + KMS |

---

## 12. 决策摘要（给评审）

1. **不存导入文件；只存数据内容**（列 + 行）到 PostgreSQL。  
2. **Document + Data Content** 双层：配置在 `analyses`，行在 `table_snapshots`。  
3. **改数 → 同步 flowchart**：默认自动重跑下游，**防抖 + 成本预算**，超预算则 stale 降级。  
4. IndexedDB 只是缓存；长期真相源是 PG。  

---

## 13. 开放问题（实现前需拍板）

1. ~~改数后自动重跑还是只标 stale？~~ → **默认自动重跑；大图降级 stale + 手动/空闲重跑**。  
2. `table_snapshots` 是否保留历史版本（回滚），还是只留 latest？  
3. `.insight` 导出是否纳入近期，还是等 PG 上线？  
4. `workspace_id` / 多租户是否第一期就建？  
5. 后端语言与部署形态？  
6. 自动重跑成本阈值（默认建议：`行数 × 下游步骤数 ≤ 200_000`）是否需按业务调整？

---

## 14. 性能策略（必做）

> 「改数后 flowchart 同步」≠「每个按键同步算完整条 DAG」。  
> 目标：编辑反馈 &lt; 50ms；防抖窗口后数据流收敛到正确结果。

### 14.1 热点与预算

| 热点 | 风险 | 策略 |
| --- | --- | --- |
| 单元格连改 | 每次全量跑 Filter/Join | **200ms 防抖合并**同一 tableId |
| 大表 × 深 DAG | `行数 × 下游步骤` 爆炸 | 成本 &gt; `AUTO_RERUN_BUDGET`（默认 2e5）→ **只标 stale** |
| 整份 Analysis 落盘 | 大 JSON 卡顿 | Document/Snapshot 拆分；保存 400ms 防抖；改行优先只 put snapshot |
| Flowchart / 图表重绘 | 重跑后整图 rebuild | graph 64ms 防抖；图表 10k 采样 |
| 外部源高频 sync | 轮询打爆 | 最小间隔、合并 dataVersion、worker 限流 |
| PG 写入 | 每格 INSERT 新版本 | 会话内更新 latest；失焦/传播完成再升 data_version |

### 14.2 两段式传播

```
单元格提交
  ├─ 立即：写回行 + markTableEdited（下游 stale 角标）  // &lt; 几 ms
  └─ 防抖 200ms
        ├─ cost = 行数 × 下游步骤数 ≤ BUDGET → rerunStaleSteps（仅子图）
        └─ cost &gt; BUDGET → 保持 stale + CTA「更新流程图」
```

### 14.3 重算怎么省

1. 只跑 stale 子图（已有），不 Run all  
2. 步骤 inputHash 未变则跳过写 snapshot（后续）  
3. 节点预览抽样；正式物化可后台  
4. P2：Join/Filter 进 Web Worker  
5. 多表脏点合并进同一次拓扑重跑  

### 14.4 存储 / API

- 读：Document 与 Snapshot 分离；行 `offset/limit`  
- 写：传播完成再 `revision++`；避免每格打 Document  
- 单 snapshot JSONB 建议 &lt; 16–32MB  

### 14.5 代码落点

- `rerun.ts`：`estimatePropagateCost` / `schedulePropagateTableEdit`  
- `DataGrid`：走 schedule，禁止每格同步全量 propagate  
- 验收：连改 10 格重跑 ≤ 2 次；小图自动同步；大图不卡死主线程
