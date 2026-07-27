# 数据长期保存、外部动态源与 Flowchart 实时更新

> 状态：设计规格（待评审）  
> 范围：`insight-studio` 持久化分层、**服务端数据库**、导入不丢、外部数据源接入、步骤图/看板实时刷新  
> 关联：`DESIGN.md` Repository 抽象、`AnalysisFile`/`files` 占位、Dashboard P2（revision / SSE）、Automation Designer Connect external

## 1. 问题与目标

### 1.1 现状缺口

| 能力 | 现状 | 风险 |
| --- | --- | --- |
| **服务端数据库** | **无**；仅浏览器 IndexedDB（Dexie） | 数据随浏览器配置消亡；无法跨设备、无法被其他系统调用 |
| 长期保存 | Dexie 整份 `Analysis` JSON（含全部行）写 IndexedDB | 清浏览器 / 换机 / IDB 配额 → 数据丢失；大表整文档覆盖成本高 |
| 导入留存 | CSV/Excel/SQL 解析后只物化 `tables[].rows`；原始文件未写入 `files` | 无法重解析、审计、再导出原始字节；`contentRef` 空转 |
| 外部动态源 | Registry / Plate / Connect external 仅为 UI 占位 | 无法对接后续仪器、中台、API |
| 实时更新 | 仅本 Tab Pinia 响应；无 revision / SSE | 外部数据变了，flowchart 与看板不会自动变 stale / 重算 |

### 1.2 目标（验收口径）

1. **入库即真相源**：导入与外部同步的数据写入**服务端数据库**（及对象存储）；浏览器 IDB 仅作缓存/离线副本，清缓存不得导致永久丢失。
2. **导入不丢**：任意导入必须先入库（原始文件 + 解析快照），再进入步骤图；跨设备、跨会话可打开同一 Analysis。
3. **可长期调用**：Analysis / 表快照 / 文件有稳定 UUID；HTTP API 按 ID 读取；Repository 从 Dexie 换 HTTP 后 Store 不变。
4. **动态源可插拔**：外部源用统一 `DataSource` + Connector；源侧变更写入 DB 新版本并通过 `dataVersion` 推送。
5. **数流实时**：源变更入库 → 下游 `StepNode` 标 `stale` →（自动或一键）按 DAG 重跑 → flowchart / 工作区 / Dashboard 同步刷新。

### 1.3 非目标（本规格不展开实现）

- 多租户权限与审计 UI
- Python Custom Code 沙箱
- 跨组织联邦查询引擎

---

## 2. 总体架构：三层存储 + 事件总线

```
┌─────────────────────────────────────────────────────────────┐
│  UI：Workspace / Flowchart / Dashboard                       │
│       Pinia analysisStore / dashboardStore                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ mutate / subscribe
┌───────────────────────────▼─────────────────────────────────┐
│  Domain：Analysis 文档（步骤图真相源）+ Pipeline / Step exec  │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │                   │                   │
   ┌────▼────┐        ┌─────▼─────┐       ┌─────▼──────┐
   │ Document│        │  Snapshot │       │ Blob/File  │
   │ Store   │        │  Store    │       │ Store      │
   │Analysis │        │表行/版本  │       │原始文件    │
   │Dashboard│        │dataVersion│       │contentRef  │
   └────┬────┘        └─────┬─────┘       └─────┬──────┘
        │                   │                   │
        └─────────┬─────────┴───────────────────┘
                  │ Repository（Dexie 缓存 → HTTP → 服务端）
┌─────────────────▼───────────────────────────────────────────┐
│  服务端：PostgreSQL（元数据+快照+事件）+ 对象存储（原始文件） │
│  API / SSE：analysis.updated | source.changed | step.*      │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│  Connectors：upload | http-poll | webhook | registry | plate │
└─────────────────────────────────────────────────────────────┘
```

**分层原则**

| 层 | 存什么 | 服务端落点 | 不存什么 |
| --- | --- | --- | --- |
| **Document** | 步骤图、视图配置、`flowchartLayout`、表 meta、源绑定 | PostgreSQL `analyses` / `dashboards`（JSONB） | 大体积行数据、原始文件字节 |
| **Snapshot** | 某次物化结果：`tableId + dataVersion → rows/columns` | PostgreSQL `table_snapshots`（JSONB 或行表） | 步骤配置 |
| **Blob** | 导入原始文件 | **对象存储**（S3/MinIO）；PG 只存元数据与 object key | 业务逻辑 |

当前前端把行内联在 Document 里；上云后 **Document 只保留表 meta + `snapshot_id`，行在 Snapshot 表，文件在对象存储**。

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

### 3.2 文件 Blob（补齐已有占位）

现有 `AnalysisFile` + Dexie `files` 表已声明但未写入。落地规则：

```ts
interface FileBlobRecord {
  id: string              // = AnalysisFile.contentRef
  analysisId: string
  sha256?: string         // 可选内容寻址，去重
  mime: string
  sizeBytes: number
  /** Blob 本体；HTTP 实现则为对象存储 key。 */
  blob: Blob | string
  createdAt: string
}
```

**导入事务（必须原子）**

1. 写 `FileBlobRecord`
2. 写 `Analysis.files[]` 元数据
3. 解析 → 写 Snapshot（或临时仍写 `tables[].rows`）
4. 写对应源步骤 `upload-csv` / `import-files` / `file-to-table`
5. `revision++`，`updatedAt = now`
6. 失败则整事务回滚，禁止出现「表有了、文件没了」或反过来

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
| `upload-csv` / `upload-xlsx` / `import-files` | 静态导入（已有/规划） |
| `connect-external` | 绑定 `DataSourceBinding`，输出表端口 |
| `file-to-table` | Blob → 表（已有规划） |

`connect-external` 的 `config` 仅存 `dataSourceId`；连接细节在 `Analysis.dataSources[]`，便于同一源被多个 Analysis 模板复用时（远期）只换绑定。

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

interface BlobRepository {
  get(contentRef: string): Promise<Blob | undefined>
  put(meta: AnalysisFile, data: Blob): Promise<string>  // returns contentRef
  delete(contentRef: string): Promise<void>
}

interface TableSnapshot {
  id: string
  analysisId: string
  tableId: string
  dataVersion: string
  columns: ColumnMeta[]
  rows: Row[]
  createdAt: string
}
```

**调用约定**

- UI / Store 只依赖接口，不直接碰 Dexie / SQL。
- 本地阶段：三接口由 Dexie 实现（开发与离线）。
- 生产真相源：**PostgreSQL + 对象存储**；HTTP Repository 对接后端 API。

### 4.2 导出 / 备份（防遗失的产品层）

1. **服务端 DB 为主备份面**（推荐最终态）。
2. 过渡期 / 离线：`.insight` zip = `analysis.json` + `blobs/*` + `snapshots/*`。
3. 上云后：PG 为主真相源，本地 Dexie 为工作副本；冲突策略 **`revision` 乐观锁**（If-Match），冲突则提示合并/覆盖。

---

## 5. 服务端数据库设计（核心）

> IndexedDB **不是**长期数据库，只是客户端缓存。  
> **长期保存与跨系统调用的真相源 = PostgreSQL + 对象存储。**

### 5.1 选型结论

| 组件 | 选型 | 理由 |
| --- | --- | --- |
| 主库 | **PostgreSQL 15+** | JSONB 适合 Analysis 文档；事务/索引/审计成熟；易被外部系统 SQL/API 调用 |
| 原始文件 | **S3 兼容对象存储**（MinIO / OSS / S3） | 大文件不进 PG；按 `content_ref` 寻址；可生命周期策略 |
| 缓存（可选） | Redis | SSE 扇出、源轮询锁、热点 snapshot 缓存 |
| 本地开发 | Dexie 模拟同一 Repository 语义；或 Docker Compose：PG + MinIO |

**不采用**（本阶段）：

- 纯 MongoDB：缺强事务与成熟关系约束，跨表一致性弱。
- 把全部行拆成「一单元格一行」的宽表：步骤物化、动态 schema 成本过高；先 JSONB 快照，行数极大时再评估列存/分区。

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

-- 导入/外部文件元数据；字节在对象存储
CREATE TABLE file_blobs (
  id            UUID PRIMARY KEY,       -- = content_ref
  analysis_id   UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  sha256        TEXT,
  storage_key   TEXT NOT NULL,          -- s3://bucket/analyses/{id}/files/{uuid}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX file_blobs_analysis ON file_blobs (analysis_id);
CREATE UNIQUE INDEX file_blobs_sha_optional ON file_blobs (analysis_id, sha256)
  WHERE sha256 IS NOT NULL;

-- 表快照：导入结果 / 步骤物化 / 外部源同步结果
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
  "files": [{ "id": "…", "contentRef": "…", "name": "…" }],
  "dataSources": [{ "id": "…", "kind": "http-dataset", "stepId": "…" }]
}
```

### 5.3 行数据存哪：三级策略

| 规模 | `row_storage` | 做法 |
| --- | --- | --- |
| ≤ ~5 万行 / ~20MB | `jsonb` | `table_snapshots.rows` JSONB；读取简单 |
| 更大 | `object` | 行序列化 gzip/Parquet 写入对象存储；PG 只留 `object_key` + `row_count` + `columns` |
| 极大 / 需 SQL 分析（远期） | `chunked` 或外部仓 | 按 chunk 表或接入分析仓；本期不做 |

前端管道仍消费「列 + 行」数组；后端按策略拼装后经 API 返回（可分页：`?offset&limit`）。

### 5.4 写入事务（导入 / 外部 sync 必须走库）

**导入 CSV/Excel（防遗失）**

```
BEGIN;
  INSERT file_blobs + PUT object storage(storage_key);   -- 原始文件先入库
  INSERT table_snapshots (data_version, columns, rows…); -- 解析结果
  UPDATE analyses
    SET document = …(挂 files / tables.snapshotId / steps),
        revision = revision + 1,
        updated_at = now()
    WHERE id = $id AND revision = $expected;             -- 乐观锁
  INSERT event_outbox (analysis.updated / source.changed);
COMMIT;
-- 成功后再 ACK 客户端；任一步失败整单回滚 + 删已传对象（或 GC）
```

**外部源变更**

```
Connector.sync → 得到新 rows + dataVersion
  → INSERT 新 table_snapshots（保留旧版可选）
  → UPDATE data_sources.last_data_version / status
  → UPDATE analyses.document 源表 snapshotId + revision++
  → 标记下游步骤 stale（写在 document.steps[].status）
  → event_outbox: source.changed
  → SSE 推客户端 → flowchart 标 stale → 可选服务端或客户端重跑子图
  → 重跑产物再 INSERT 新 snapshots + revision++
```

### 5.5 读取与「长期调用」

| 调用方 | API 示例 | 库访问 |
| --- | --- | --- |
| Insight 前端 | `GET /analyses/:id` | `analyses` + 按需 `table_snapshots` |
| 表格分页 | `GET /analyses/:id/tables/:tid/rows?offset&limit` | snapshot JSONB 切片或 object 流式 |
| 原始文件下载 | `GET /files/:contentRef` | `file_blobs` → 预签名 URL |
| 外部系统整合 | `GET /analyses/:id/export` 或只读 SQL 视图 | 同库；后续可加只读角色 |
| Dashboard | `GET /dashboards/:id` + 批量 `analyses?ids=` | `dashboards` + snapshots |

所有稳定资源用 **UUID**；`revision` 用于缓存与并发控制（`ETag` / `If-Match`）。

### 5.6 与实时通道的关系

```
DB 事务提交
  → event_outbox 同行写入
  → 后台 publisher 读 outbox → SSE/WebSocket / Redis PubSub
  → 浏览器 flowchart / dashboard 失效缓存并刷新
```

禁止「只推事件不写库」或「只写库不推事件」；**以 DB 提交为唯一真相，outbox 保证至少一次投递**。

### 5.7 Dexie → PostgreSQL 迁移路径

1. 前端继续 Dexie；增加「同步到服务器」：读本地 Analysis + blobs → 调用批量导入 API 写入 PG/对象存储。  
2. 切换默认 Repository 为 HTTP；Dexie 降级为离线队列。  
3. 旧本地-only 文档提示迁移；迁移成功后可清 IDB。

### 5.8 后端服务边界（建议）

```
insight-api
  ├── REST: analyses / dashboards / files / data-sources / snapshots
  ├── SSE:  /events
  ├── workers: connector poll、DAG rerun（可选）、outbox publisher
  └── 依赖: PostgreSQL, Object Storage, (Redis)
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
Connector sync 成功
  → 写 Snapshot（新 dataVersion）——服务端即 INSERT table_snapshots
  → 更新源 Step 输出表 meta
  → 标记该源步骤 status = configured（或 running→configured）
  → markDownstreamStale(stepId)   // 复用 modules/steps/rerun.ts 思路
  → revision++（UPDATE analyses）
  → 发布 analysis.updated { id, revision, reason: 'source.changed', sourceId }
  → Flowchart 节点显示 stale 角标
  → 策略：autoRerun ? runStaleSubgraph() : 等待用户「Run stale」
```

**实时性定义（产品）**

- **结构实时**：边/节点状态、stale 标记、错误信息 ≤ 数百 ms 推到打开中的客户端。
- **数据实时**：物化重算可异步；大表允许「节点已更新、预览仍计算中」。
- 默认建议：**自动标 stale + 可选自动重跑**（Analysis 级开关 `autoRerunOnSourceChange`，默认 true 小图、大图 false 防抖）。

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
用户选择文件 / 外部 sync
  → 服务端：对象存储 + file_blobs（先落库）
  → AnalysisFile 元数据挂到 analyses.document.files
  → 解析 → INSERT table_snapshots
  → 创建/更新 StepNode + AnalysisTable.snapshotId
  → analyses.revision++ + event_outbox
  （本地过渡期：等价写 Dexie blobs/snapshots）
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

- 删 Analysis：`ON DELETE CASCADE` 清 snapshots / file_blobs 元数据；对象存储异步 GC。
- 删源步骤：若 Blob 无其他引用则删；否则仅摘引用。
- 定期 GC：扫描无引用 `storage_key` / 过期 snapshot（若只保留 latest）。

---

## 9. 与现有代码的落点

| 模块 | 路径 | 改动要点 |
| --- | --- | --- |
| 服务端 DB | 新建 `insight-api` + migration | §5 表结构；OpenAPI 对齐 Repository |
| DB（本地） | `insight-studio/src/shared/db.ts` | 过渡：`blobs` / `snapshots`；最终降级为缓存 |
| Types | `shared/types.ts` | `revision`、`DataSourceBinding`、`snapshotId`、`dataVersion` |
| Repository | `shared/repository.ts` | Document/Snapshot/Blob；增加 `HttpAnalysisRepository` |
| Import | `modules/table/commitImport.ts` | 导入事务含 Blob / 上传 API |
| Rerun | `modules/steps/rerun.ts` | 暴露 `markDownstreamStale` / `runStaleSubgraph` |
| Flowchart | `modules/flowchart/*` | 订阅 SSE；节点展示 dataVersion / stale |
| Dashboard | `modules/dashboard/widgetData.ts` | 缓存键加入 `revision` / `dataVersion` |
| Connect UI | `AddDataMenu` / Sidebar Connect | Connector 配置；同步写 `data_sources` |

---

## 10. 分阶段交付

### Phase A — 本地语义对齐（开发期）

1. Dexie：`blobs` + 导入写原始文件；`AnalysisFile` 填实；`revision`  
2. 项目包导出 / 导入（`.insight`）  
3. 单测：导入事务完整性  

### Phase B — Snapshot 拆分 + 本地实时

1. 大表行迁 Snapshot；Document 瘦身  
2. `BroadcastChannel` 跨 Tab  
3. 源节点 Refresh + stale + Run stale  

### Phase C — 外部源（仍可先打本地/Mock API）

1. `DataSourceBinding` + `http-dataset` Connector  
2. `connect-external` 步骤  
3. sync → DB 快照 → stale → 可选 auto rerun  

### Phase D — **PostgreSQL + 对象存储上线**（长期保存真正落地）

1. 按 §5 建库：`analyses` / `dashboards` / `file_blobs` / `table_snapshots` / `data_sources` / `event_outbox`  
2. 对象存储接文件上传与预签名下载  
3. HTTP Repository 切换为默认；Dexie 仅离线  
4. outbox → SSE；Dashboard / flowchart 接服务端事件  
5. 本地数据一键迁移到 PG  

---

## 11. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| 只做前端 IDB、迟迟不上 PG | Phase D 为「长期保存」硬门槛；验收以「清浏览器后仍能打开」为准 |
| JSONB 大快照撑爆 PG | §5.3 阈值切 `object` 存储；API 分页 |
| 对象存储与 PG 不一致 | 先写对象再写元数据事务；失败 GC；禁止只写一端 |
| IDB 配额（过渡期） | 引导导出 / 尽快上云 |
| 外部源 schema 漂移 | sync 列对齐报告；失败保留旧 snapshot |
| 自动重跑打爆 CPU | Analysis 级开关；服务端 worker 限流 |
| 密钥进库明文 | `secrets` 表 + KMS；config 只存 `secret_ref` |

---

## 12. 决策摘要（给评审）

1. **长期真相源是 PostgreSQL + 对象存储**，不是 IndexedDB。  
2. **三层落库**：Document → `analyses.document`；行 → `table_snapshots`；文件 → 对象存储 + `file_blobs`。  
3. **导入/外部 sync 必须走 DB 事务 + outbox**，再推 SSE 驱动 flowchart。  
4. **外部源**经 `data_sources` / Connector，变更只增 snapshot 版本。  
5. 前端 Repository 可换；Dexie 仅为开发与离线缓存。  

---

## 13. 开放问题（实现前需拍板）

1. 外部源变更后默认 **自动重跑** 还是 **仅标 stale**？  
2. `table_snapshots` 是否保留历史版本（回滚），还是只留 latest？  
3. ~~服务端用文档库还是关系库？~~ → **已拍板推荐：PostgreSQL JSONB + 对象存储**（见 §5）；若团队有强约束技术栈再复议。  
4. `.insight` 导出是否纳入 Phase A 必做，还是等 PG 上线后只做云备份？  
5. `workspace_id` / 多租户是否第一期就建，还是单租户硬编码后再加？  
6. 后端语言与部署形态（单体 API vs 已有中台旁路）？
