# 数据长期保存、外部动态源与 Flowchart 实时更新

> 状态：设计规格（待评审）  
> 范围：`insight-studio` 持久化分层、导入不丢、外部数据源接入、步骤图/看板实时刷新  
> 关联：`DESIGN.md` Repository 抽象、`AnalysisFile`/`files` 占位、Dashboard P2（revision / SSE）、Automation Designer Connect external

## 1. 问题与目标

### 1.1 现状缺口

| 能力 | 现状 | 风险 |
| --- | --- | --- |
| 长期保存 | Dexie 整份 `Analysis` JSON（含全部行）写 IndexedDB | 清浏览器 / 换机 / IDB 配额 → 数据丢失；大表整文档覆盖成本高 |
| 导入留存 | CSV/Excel/SQL 解析后只物化 `tables[].rows`；原始文件未写入 `files` | 无法重解析、审计、再导出原始字节；`contentRef` 空转 |
| 外部动态源 | Registry / Plate / Connect external 仅为 UI 占位 | 无法对接后续仪器、中台、API |
| 实时更新 | 仅本 Tab Pinia 响应；无 revision / SSE | 外部数据变了，flowchart 与看板不会自动变 stale / 重算 |

### 1.2 目标（验收口径）

1. **导入不丢**：任意导入（文件或外部快照）必须先入库（原始字节或行级快照），再进入步骤图；关闭标签页、刷新、重启应用后仍可打开同一 Analysis。
2. **可长期调用**：Analysis / 表快照 / 文件 Blob 有稳定 ID；Repository 可从本地 Dexie 平滑换成服务端 HTTP，调用方不变。
3. **动态源可插拔**：外部源用统一 `DataSource` + Connector；源侧变更通过 `dataVersion` 推到订阅方。
4. **数流实时**：源变更 → 下游 `StepNode` 标 `stale` →（自动或一键）按 DAG 重跑 → flowchart / 工作区 / Dashboard 同步刷新。

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
                  │ Repository（Dexie → HTTP）
┌─────────────────▼───────────────────────────────────────────┐
│  Sync / Event：revision 频道（本机 BroadcastChannel → SSE） │
│  analysis.updated | source.changed | step.stale | step.done │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│  Connectors：upload | http-poll | webhook | registry | plate │
└─────────────────────────────────────────────────────────────┘
```

**分层原则**

| 层 | 存什么 | 不存什么 |
| --- | --- | --- |
| **Document** | 结构与配置：`steps`、视图配置、`flowchartLayout`、表 meta、源绑定 | 大体积行数据（演进后）、原始文件字节 |
| **Snapshot** | 某次物化结果：`tableId + dataVersion → rows/columns` | 步骤配置（属于 Document） |
| **Blob** | 导入原始文件（CSV/XLSX/JSON…）按 content-hash 或 UUID | 业务逻辑 |

当前 P0 已把行内联在 Document 里；演进时 **Document 只保留表 meta + `snapshotRef`，行迁到 Snapshot**，避免每次改一个 filter 就整包重写百万行。

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

- UI / Store 只依赖接口，不直接碰 Dexie。
- `Http*` 实现：Document → PostgreSQL/JSON 文档或对象；Blob → S3/MinIO；Snapshot → 列存或 compressed JSON。
- 本地阶段：三个接口均可由 Dexie 多表实现；`put(Analysis)` 事务同时写 analyses + snapshots + files。

### 4.2 导出 / 备份（防遗失的产品层）

即使无服务端，也提供「不会丢」的兜底：

1. **项目包导出**：`.insight` zip = `analysis.json` + `blobs/*` + `snapshots/*`
2. **导入项目包**：反向恢复 Document + Blob + Snapshot
3. 可选：定时提示「未备份的本地 Analysis」

服务端上线后：云端为主真相源，本地 Dexie 为工作副本；冲突策略默认 **Last-Write-Wins by `updatedAt` + `revision` 校验**，revision 冲突则提示合并/覆盖。

---

## 5. 外部动态源与 Connector

### 5.1 Connector 契约

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

### 5.2 同步策略

| 模式 | 适用 | 行为 |
| --- | --- | --- |
| **手动 Refresh** | 上传文件、偶发 API | 用户点「同步」或源节点 Rerun |
| **轮询** | 无 webhook 的 HTTP | `config.pollIntervalMs`，后台 sync |
| **推送** | 中台 webhook / 内部 SSE | `source.changed` → 自动 sync |
| **打开时刷新** | Dashboard / Analysis 获焦 | 对齐 Dashboard 设计 P2a |

### 5.3 变更如何进入 flowchart 数流

```
Connector sync 成功
  → 写 Snapshot（新 dataVersion）
  → 更新源 Step 输出表 meta
  → 标记该源步骤 status = configured（或 running→configured）
  → markDownstreamStale(stepId)   // 复用 modules/steps/rerun.ts 思路
  → revision++
  → 发布 analysis.updated { id, revision, reason: 'source.changed', sourceId }
  → Flowchart 节点显示 stale 角标
  → 策略：autoRerun ? runStaleSubgraph() : 等待用户「Run stale」
```

**实时性定义（产品）**

- **结构实时**：边/节点状态、stale 标记、错误信息 ≤ 数百 ms 推到打开中的客户端。
- **数据实时**：物化重算可异步；大表允许「节点已更新、预览仍计算中」。
- 默认建议：**自动标 stale + 可选自动重跑**（Analysis 级开关 `autoRerunOnSourceChange`，默认 true 小图、大图 false 防抖）。

---

## 6. 事件总线与多端刷新

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
| 本地 P1 | `BroadcastChannel('insight-studio')` + 同 Tab Pinia |
| 服务端 P2 | SSE `/events?analysisIds=` 或 WebSocket；payload 同上 |
| Dashboard | 收 `analysis.updated` → 按 `(analysisId, tableId, viewId, revision)` 失效 widget 缓存 |

Flowchart 订阅同一频道：收到事件后若当前打开的 Analysis 匹配，则 `get(id)` 或增量打补丁，重建 graph（现有 `modules/flowchart/graph.ts`），保留 `flowchartLayout`。

---

## 7. 导入路径改造（防遗失）

### 7.1 目标路径

```
用户选择文件 / 外部 sync
  → BlobRepository.put（先落盘）
  → AnalysisFile 元数据挂到 Analysis.files
  → 解析（papaparse / xlsx / connector）
  → SnapshotRepository.put 或兼容写入 tables.rows
  → 创建/更新 StepNode + AnalysisTable
  → store.mutate → Document put + revision++
```

### 7.2 对现有入口的要求

| 入口 | 改造 |
| --- | --- |
| `commitImportedTable` | 增加可选 `file?: { blob, name, mime }`；有文件则先写 Blob |
| CSV / Excel Dialog | 保留原 File 对象直至事务成功；禁止只留 parsed rows |
| SQL（alasql） | 无外部文件：物化结果进 Snapshot，步骤 `query-sql` 的 config 保存查询文本（已有） |
| Combine / Join | 无新 Blob；依赖上游 snapshotRef |
| Connect external | 每次 sync 写新 Snapshot；可选保留历史 N 个版本便于回滚 |

### 7.3 删除与孤儿清理

- 删 Analysis：级联删其 Blob + Snapshot。
- 删源步骤：若 Blob 无其他引用则删；否则仅摘引用。
- 定期 GC：扫描无引用 `contentRef` / `snapshotRef`。

---

## 8. 与现有代码的落点

| 模块 | 路径 | 改动要点 |
| --- | --- | --- |
| DB | `insight-studio/src/shared/db.ts` | 增加 `blobs` / `snapshots` 表版本；`files` 真正使用 |
| Types | `shared/types.ts` | `revision`、`DataSourceBinding`、`snapshotRef`、`dataVersion` |
| Repository | `shared/repository.ts` | 拆 Document/Snapshot/Blob；保留 facade `putAnalysisFull` |
| Import | `modules/table/commitImport.ts` | 导入事务含 Blob |
| Rerun | `modules/steps/rerun.ts` | 暴露 `markDownstreamStale` / `runStaleSubgraph` 给 source 事件 |
| Flowchart | `modules/flowchart/*` | 订阅事件；节点展示 dataVersion / stale |
| Dashboard | `modules/dashboard/widgetData.ts` | 缓存键加入 `revision` / `dataVersion` |
| Connect UI | `AddDataMenu` / Sidebar Connect | 从 toast 占位改为 Connector 配置抽屉 |

---

## 9. 分阶段交付

### Phase A — 本地不丢（优先）

1. Dexie：`blobs` 表 + 导入写原始文件；`AnalysisFile` 填实  
2. Analysis 增加 `revision`；`mutate` 每次 +1  
3. 项目包导出 / 导入（`.insight`）  
4. 单测：导入断电模拟（事务中断）不产生半截 Analysis；刷新后 Blob 仍在  

### Phase B — Snapshot 拆分 + 本地实时

1. 大表行迁 Snapshot；Document 瘦身  
2. `BroadcastChannel` 跨 Tab 刷新 flowchart / dashboard  
3. 源节点手动 Refresh + stale 下游 + Run stale（复用 rerun）  

### Phase C — 外部源

1. `DataSourceBinding` + `http-dataset` Connector（轮询 + 手动）  
2. `connect-external` 步骤接入 flowchart  
3. sync → stale →（可选）auto rerun → UI 更新  

### Phase D — 服务端长期存储

1. HTTP Repository 实现（Document / Snapshot / Blob）  
2. SSE `analysis.updated` / `source.changed`  
3. 本地 Dexie 作离线缓存；上线冲突策略  

---

## 10. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| IDB 配额仍不够 | Blob 压缩；Snapshot 分页；引导导出/上云 |
| 整文档 `JSON.parse/stringify` 剥 Proxy 在大表上卡顿 | 拆 Snapshot 后 Document put 变轻；Blob 不走 JSON |
| 外部源 schema 漂移 | sync 时做列对齐报告；不兼容则步骤 `failed` + 保留旧 Snapshot |
| 自动重跑打爆 CPU | Analysis 级开关；大图默认仅 stale；DAG 增量只跑受影响子图 |
| 密钥进 IndexedDB | Connector 鉴权只存 secretRef，密钥进系统密钥库（服务端）或用户粘贴会话级 |

---

## 11. 决策摘要（给评审）

1. **真相源分层**：步骤图与配置在 Document；行在 Snapshot；原始导入在 Blob。导入必须先 Blob 后表。  
2. **外部源一等公民**：`DataSourceBinding` + Connector；变更只通过 `dataVersion` 进入图，不直接改下游视图配置。  
3. **实时 = 事件 + stale + 重跑**：与 Dashboard P2 revision/SSE 同一条事件模型，flowchart 共用。  
4. **Repository 可换**：本地 Dexie 先做完整语义，再换 HTTP，避免日后重写 Store。  

---

## 12. 开放问题（实现前需拍板）

1. 外部源变更后默认 **自动重跑** 还是 **仅标 stale**？  
2. Snapshot 是否保留历史版本（回滚），还是只留 latest？  
3. 服务端优先用「文档库 + 对象存储」还是「关系库表行」？  
4. `.insight` 导出是否纳入 Phase A 必做，还是等云端后再做备份？
