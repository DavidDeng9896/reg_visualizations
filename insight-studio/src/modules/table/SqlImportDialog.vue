<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { DataType } from '../../shared/types'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, ISelect, ITextField, IToggle, type SelectOption } from '../../ui'
import { inferColumnTypes } from './csv'
import { commitImportedTable, objectRowsToGrid } from './commitImport'
import {
  listDbConnections,
  removeDbConnection,
  upsertDbConnection,
} from './dbConnections'
import { DEFAULT_PORTS, defaultProfile, type DbConnectionProfile, type SqlDialect } from './dbConnectionTypes'
import {
  checkSqlProxyHealth,
  fetchRemoteSchema,
  remoteSchemaForEditor,
  runRemoteSqlQuery,
  startSqlProxy,
  testRemoteConnection,
  type RemoteSchemaTable,
} from './remoteSql'
import SqlEditor from './SqlEditor.vue'
import { buildSqlSchema, runSqlQuery, schemaForEditor } from './sqlQuery'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

type SourceMode = 'remote' | 'local'
const sourceMode = ref<SourceMode>('remote')

const sql = ref('SELECT 1 AS id, \'demo\' AS name')
const tableName = ref('sql_result')
const running = ref(false)
const runError = ref('')
const headers = ref<string[]>([])
const dataRows = ref<string[][]>([])
const typeOverrides = ref<(DataType | undefined)[]>([])
const inferred = ref<DataType[]>([])
const lastSql = ref('')
const truncated = ref(false)

/* ---- remote connection ---- */
const connections = ref<DbConnectionProfile[]>([])
const activeId = ref<string>('')
const draft = ref<DbConnectionProfile>(defaultProfile())
const proxyOk = ref<boolean | null>(null)
const startingProxy = ref(false)
const testing = ref(false)
const testMsg = ref('')
/** 连接反馈语气：成功 / 失败 / 中性 */
const testMsgTone = ref<'ok' | 'bad' | 'neutral'>('neutral')
const remoteTables = ref<RemoteSchemaTable[]>([])
const schemaLoading = ref(false)
const showConnForm = ref(true)

const PREVIEW_ROWS = 50

const tables = computed(() => current.value?.tables ?? [])
const localSchemaList = computed(() => buildSqlSchema(tables.value))

const editorSchema = computed(() => {
  if (sourceMode.value === 'remote') return remoteSchemaForEditor(remoteTables.value)
  return schemaForEditor(tables.value)
})

const sideTables = computed(() => {
  if (sourceMode.value === 'remote') {
    return remoteTables.value.map((t) => ({
      sqlName: t.name,
      label: t.name,
      colCount: t.columns.length,
    }))
  }
  return localSchemaList.value.map((t) => ({
    sqlName: t.sqlName,
    label: t.name === t.sqlName ? t.sqlName : `${t.name} → ${t.sqlName}`,
    colCount: t.columns.length,
  }))
})

const hasData = computed(() => headers.value.length > 0)
const previewRows = computed(() => dataRows.value.slice(0, PREVIEW_ROWS))
const columnTypes = computed<DataType[]>(() =>
  headers.value.map((_, i) => typeOverrides.value[i] ?? inferred.value[i] ?? 'string'),
)

const typeOptions: SelectOption[] = [
  { value: 'string', label: 'Text', icon: 'type-text' },
  { value: 'number', label: 'Number', icon: 'type-number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date', icon: 'calendar' },
  { value: 'datetime', label: 'Datetime', icon: 'calendar' },
  { value: 'structure', label: 'Structure', icon: 'type-structure' },
]

const dialectOptions: SelectOption[] = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
]

const connectionOptions = computed<SelectOption[]>(() =>
  connections.value.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.dialect} · ${c.host}/${c.database})`,
  })),
)

function resetResult() {
  headers.value = []
  dataRows.value = []
  typeOverrides.value = []
  inferred.value = []
  runError.value = ''
  lastSql.value = ''
  truncated.value = false
}

function close() {
  emit('update:open', false)
}

function reloadConnections() {
  connections.value = listDbConnections()
  if (!activeId.value && connections.value[0]) {
    selectConnection(connections.value[0].id)
  } else if (activeId.value) {
    const found = connections.value.find((c) => c.id === activeId.value)
    if (found) draft.value = { ...found }
  }
}

function selectConnection(id: string | number) {
  const cid = String(id)
  activeId.value = cid
  const found = connections.value.find((c) => c.id === cid)
  if (found) {
    draft.value = { ...found }
    showConnForm.value = false
    void loadRemoteSchema()
  }
}

function newConnection() {
  draft.value = defaultProfile({ name: `连接 ${connections.value.length + 1}` })
  activeId.value = draft.value.id
  showConnForm.value = true
  remoteTables.value = []
  testMsg.value = ''
  testMsgTone.value = 'neutral'
}

function onDialectChange(v: string | number) {
  const d = v as SqlDialect
  draft.value.dialect = d
  draft.value.port = DEFAULT_PORTS[d]
}

function saveConnection(opts?: { silent?: boolean }) {
  const p = {
    ...draft.value,
    name: draft.value.name.trim() || '未命名连接',
    host: draft.value.host.trim(),
    database: draft.value.database.trim(),
    user: draft.value.user.trim(),
  }
  draft.value = p
  connections.value = upsertDbConnection(p)
  activeId.value = p.id
  if (!opts?.silent) {
    testMsg.value = '已保存到本机'
    testMsgTone.value = 'ok'
  }
}

function deleteConnection() {
  if (!activeId.value) return
  connections.value = removeDbConnection(activeId.value)
  activeId.value = ''
  remoteTables.value = []
  if (connections.value[0]) selectConnection(connections.value[0].id)
  else newConnection()
}

async function refreshProxy() {
  proxyOk.value = await checkSqlProxyHealth()
}

async function startProxy() {
  if (startingProxy.value) return
  startingProxy.value = true
  testMsg.value = ''
  testMsgTone.value = 'neutral'
  try {
    await startSqlProxy()
    await refreshProxy()
    if (proxyOk.value) {
      testMsg.value = 'SQL 代理已启动。'
      testMsgTone.value = 'ok'
    }
  } catch (e) {
    testMsg.value = e instanceof Error ? e.message : String(e)
    testMsgTone.value = 'bad'
    await refreshProxy()
  } finally {
    startingProxy.value = false
  }
}

async function testConn() {
  testing.value = true
  testMsg.value = ''
  testMsgTone.value = 'neutral'
  try {
    if (!draft.value.host.trim() || !draft.value.database.trim() || !draft.value.user.trim()) {
      testMsg.value = '请填写 Host、Database、User'
      testMsgTone.value = 'bad'
      return
    }
    await refreshProxy()
    if (!proxyOk.value) {
      testMsg.value = 'SQL 代理未启动。请点上方「启动」，或在 insight-studio 目录执行 npm run dev:api。'
      testMsgTone.value = 'bad'
      return
    }
    const version = await testRemoteConnection(draft.value)
    saveConnection({ silent: true })
    testMsg.value = `连接成功 · ${version.slice(0, 80)}（已保存）`
    testMsgTone.value = 'ok'
    await loadRemoteSchema()
  } catch (e) {
    testMsg.value = e instanceof Error ? e.message : '连接失败'
    testMsgTone.value = 'bad'
  } finally {
    testing.value = false
  }
}

async function loadRemoteSchema() {
  if (sourceMode.value !== 'remote') return
  if (!draft.value.host || !draft.value.database || !draft.value.user) return
  schemaLoading.value = true
  try {
    remoteTables.value = await fetchRemoteSchema(draft.value)
  } catch (e) {
    remoteTables.value = []
    if (!runError.value) {
      testMsg.value = e instanceof Error ? e.message : '读取表结构失败'
    }
  } finally {
    schemaLoading.value = false
  }
}

function insertTableRef(sqlName: string) {
  sql.value = `SELECT * FROM ${sqlName} LIMIT 100`
}

async function run() {
  running.value = true
  runError.value = ''
  truncated.value = false
  try {
    let result: { rows: Record<string, unknown>[]; columns: string[]; truncated?: boolean }
    if (sourceMode.value === 'remote') {
      await refreshProxy()
      if (!proxyOk.value) throw new Error('SQL 代理未启动。请点上方「启动」，或在 insight-studio 目录执行 npm run dev:api。')
      result = await runRemoteSqlQuery(draft.value, sql.value)
      truncated.value = !!result.truncated
    } else {
      result = runSqlQuery(sql.value, tables.value)
    }
    lastSql.value = sql.value.trim()
    if (!result.rows.length) {
      headers.value = result.columns.length ? result.columns : []
      dataRows.value = []
      runError.value = headers.value.length ? '查询成功，但结果为空（0 行）' : '查询成功，但没有返回行'
      inferred.value = []
      typeOverrides.value = []
      return
    }
    const grid = objectRowsToGrid(result.rows)
    headers.value = grid.headers
    dataRows.value = grid.dataRows
    inferred.value = inferColumnTypes(headers.value, dataRows.value).map((c) => c.dataType)
    typeOverrides.value = headers.value.map(() => undefined)
    if (!tableName.value.trim()) tableName.value = 'sql_result'
  } catch (e) {
    resetResult()
    runError.value = e instanceof Error ? e.message : 'SQL 执行失败'
  } finally {
    running.value = false
  }
}

function setType(i: number, v: string | number) {
  typeOverrides.value[i] = v as DataType
}

const committing = ref(false)

async function confirm() {
  if (!hasData.value || !dataRows.value.length || committing.value) return
  committing.value = true
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  try {
    const ok = commitImportedTable({
      name: tableName.value,
      headers: headers.value,
      dataRows: dataRows.value,
      columnTypes: columnTypes.value,
      stepType: 'query-sql',
      stepConfig: {
        sql: lastSql.value || sql.value,
        source: sourceMode.value,
        ...(sourceMode.value === 'remote'
          ? {
              dialect: draft.value.dialect,
              host: draft.value.host,
              database: draft.value.database,
              connectionName: draft.value.name,
              connectionId: draft.value.id,
              lastSyncedAt: new Date().toISOString(),
              autoRefresh: false,
            }
          : {
              lastSyncedAt: new Date().toISOString(),
            }),
      },
      sourceLabel: sourceMode.value === 'remote' ? `SQL · ${draft.value.name}` : 'SQL · 本地表',
    })
    if (ok) close()
  } finally {
    committing.value = false
  }
}

watch(
  () => props.open,
  async (v) => {
    if (!v) return
    reloadConnections()
    await refreshProxy()
    if (sourceMode.value === 'remote') {
      if (!connections.value.length) {
        newConnection()
        sql.value = 'SELECT 1 AS id'
      } else if (activeId.value) {
        void loadRemoteSchema()
      }
    } else if (localSchemaList.value.length && /^SELECT 1 AS id/i.test(sql.value.trim())) {
      sql.value = `SELECT * FROM ${localSchemaList.value[0].sqlName} LIMIT 100`
    }
  },
)

watch(sourceMode, (mode) => {
  resetResult()
  runError.value = ''
  if (mode === 'local' && localSchemaList.value.length) {
    sql.value = `SELECT * FROM ${localSchemaList.value[0].sqlName} LIMIT 100`
  } else if (mode === 'remote') {
    sql.value = 'SELECT 1 AS id'
    void loadRemoteSchema()
  }
})
</script>

<template>
  <IModal :open="open" title="Import from SQL" :width="920" @update:open="emit('update:open', $event)">
    <div class="sql">
      <div class="sql__modes" role="tablist">
        <button
          type="button"
          class="sql__mode"
          :class="{ 'sql__mode--on': sourceMode === 'remote' }"
          role="tab"
          :aria-selected="sourceMode === 'remote'"
          @click="sourceMode = 'remote'"
        >
          外部数据库
        </button>
        <button
          type="button"
          class="sql__mode"
          :class="{ 'sql__mode--on': sourceMode === 'local' }"
          role="tab"
          :aria-selected="sourceMode === 'local'"
          @click="sourceMode = 'local'"
        >
          本地已有表
        </button>
      </div>

      <p class="sql__hint">
        <template v-if="sourceMode === 'remote'">
          连接你自己的 Postgres / MySQL，用 SQL 拉数导入。需本机 SQL 代理
          <code>npm run dev:api</code>
          （状态：
          <span class="sql__proxy-status">
            <span :class="proxyOk ? 'sql__ok' : 'sql__bad'">{{
              proxyOk ? '已连接' : proxyOk === false ? '未启动' : '检测中…'
            }}</span>
            <IButton
              v-if="proxyOk === false"
              size="sm"
              variant="secondary"
              icon="play"
              class="sql__proxy-start"
              data-testid="sql-proxy-start"
              aria-label="启动 SQL 代理"
              :loading="startingProxy"
              @click="startProxy"
            >
              {{ startingProxy ? '启动中…' : '启动' }}
            </IButton>
          </span>
          ）。Host 填数据库地址（本机库用 <code>127.0.0.1</code>）；密码只保存在本机浏览器。
        </template>
        <template v-else>
          在浏览器内对当前 Analysis 已导入的表执行只读 SELECT。快捷键 <kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd>。
        </template>
      </p>

      <div v-if="sourceMode === 'remote'" class="sql__conn">
        <div class="sql__conn-row">
          <ISelect
            v-if="connectionOptions.length"
            :model-value="activeId"
            :options="connectionOptions"
            size="sm"
            class="sql__conn-select"
            aria-label="已保存连接"
            @update:model-value="selectConnection"
          />
          <IButton size="sm" variant="secondary" icon="plus" @click="newConnection">新建连接</IButton>
          <IButton size="sm" variant="ghost" @click="showConnForm = !showConnForm">
            {{ showConnForm ? '收起配置' : '编辑连接' }}
          </IButton>
        </div>

        <div v-if="showConnForm" class="sql__form">
          <ITextField v-model="draft.name" size="sm" placeholder="连接名称" aria-label="连接名称" />
          <ISelect
            :model-value="draft.dialect"
            :options="dialectOptions"
            size="sm"
            aria-label="数据库类型"
            @update:model-value="onDialectChange"
          />
          <ITextField v-model="draft.host" size="sm" placeholder="Host" aria-label="Host" />
          <ITextField
            :model-value="String(draft.port)"
            size="sm"
            type="number"
            placeholder="Port"
            aria-label="Port"
            @update:model-value="draft.port = Number($event) || DEFAULT_PORTS[draft.dialect]"
          />
          <ITextField v-model="draft.database" size="sm" placeholder="Database" aria-label="Database" />
          <ITextField v-model="draft.user" size="sm" placeholder="User" aria-label="User" />
          <ITextField
            v-model="draft.password"
            size="sm"
            type="password"
            placeholder="Password"
            aria-label="Password"
            class="sql__pw"
          />
          <label class="sql__ssl">
            <span>SSL</span>
            <IToggle v-model="draft.ssl" aria-label="SSL" />
          </label>
          <div class="sql__form-actions">
            <IButton size="sm" variant="secondary" :loading="testing" @click="testConn">
              测试并保存
            </IButton>
            <IButton size="sm" variant="ghost" @click="() => saveConnection()">仅保存</IButton>
            <IButton size="sm" variant="ghost" :disabled="!activeId" @click="deleteConnection">删除</IButton>
          </div>
          <p
            v-if="testMsg"
            class="sql__test-msg"
            :class="{
              'sql__test-msg--ok': testMsgTone === 'ok',
              'sql__test-msg--bad': testMsgTone === 'bad',
            }"
            role="status"
          >
            {{ testMsg }}
          </p>
        </div>
      </div>

      <div class="sql__layout">
        <aside class="sql__side">
          <div class="sql__side-title">
            {{ sourceMode === 'remote' ? '库表' : '可用表' }}
            <button
              v-if="sourceMode === 'remote'"
              type="button"
              class="sql__refresh"
              :disabled="schemaLoading"
              title="刷新表结构"
              @click="loadRemoteSchema"
            >
              <IIcon name="refresh" :size="12" />
            </button>
          </div>
          <p v-if="schemaLoading" class="sql__side-empty">读取表结构…</p>
          <p v-else-if="!sideTables.length" class="sql__side-empty">
            {{
              sourceMode === 'remote'
                ? '测试连接成功后会列出表；也可直接写 SQL。'
                : '暂无本地表。可先导入 CSV/Excel，或切到「外部数据库」。'
            }}
          </p>
          <button
            v-for="t in sideTables"
            :key="t.sqlName"
            type="button"
            class="sql__table"
            :title="t.label"
            @click="insertTableRef(t.sqlName)"
          >
            <IIcon name="database" :size="13" />
            <span class="sql__table-name is-ellipsis">{{ t.sqlName }}</span>
            <span class="sql__table-meta">{{ t.colCount }} 列</span>
          </button>
        </aside>

        <div class="sql__main">
          <SqlEditor v-model="sql" :schema="editorSchema" @run="run" />
          <div class="sql__actions">
            <IButton size="sm" variant="secondary" :loading="running" @click="run">
              运行
            </IButton>
            <ITextField v-model="tableName" size="sm" class="sql__name" placeholder="导入后的表名" aria-label="表名" />
          </div>
          <p v-if="runError" class="sql__error">{{ runError }}</p>
          <p v-if="truncated" class="sql__warn">结果已截断到上限行数，请在 SQL 中加更严格的 WHERE / LIMIT。</p>

          <div v-if="hasData && dataRows.length" class="sql__preview">
            <div class="sql__stats">
              {{ dataRows.length }} 行 × {{ headers.length }} 列 · 预览前 {{ Math.min(PREVIEW_ROWS, dataRows.length) }} 行
            </div>
            <div class="sql__scroll">
              <table class="sql__table-grid">
                <thead>
                  <tr>
                    <th v-for="(h, i) in headers" :key="i">
                      <div class="sql__colhead">
                        <span class="is-ellipsis" :title="h">{{ h }}</span>
                        <ISelect
                          :model-value="columnTypes[i]"
                          :options="typeOptions"
                          size="sm"
                          @update:model-value="setType(i, $event)"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(line, r) in previewRows" :key="r">
                    <td v-for="(h, i) in headers" :key="i">
                      <span class="is-ellipsis" :title="line[i] ?? ''">{{ line[i] ?? '' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <IButton @click="close">取消</IButton>
      <IButton
        variant="primary"
        :disabled="!hasData || !dataRows.length || running"
        :loading="committing"
        @click="confirm"
      >
        Add table
      </IButton>
    </template>
  </IModal>
</template>

<style scoped>
.sql {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sql__modes {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  background: var(--is-surface-muted, #f2f4f7);
  width: fit-content;
}
.sql__mode {
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.sql__mode--on {
  background: var(--is-surface, #fff);
  color: var(--is-text);
  box-shadow: 0 1px 2px rgb(16 24 40 / 8%);
}
.sql__hint {
  margin: 0;
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.45;
}
.sql__hint code,
.sql__hint kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--is-surface-muted, #f2f4f7);
  border: 1px solid var(--is-border);
}
.sql__proxy-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  vertical-align: middle;
}
.sql__ok {
  color: var(--is-success);
  font-weight: 600;
}
.sql__bad {
  color: var(--is-danger);
  font-weight: 600;
}
.sql__proxy-start {
  height: 22px;
  padding: 0 8px;
}
.sql__conn {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface-muted, #f8fafc);
}
.sql__conn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.sql__conn-select {
  flex: 1;
  min-width: 200px;
}
.sql__form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
}
.sql__pw {
  grid-column: span 2;
}
.sql__ssl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--is-text-secondary);
}
.sql__form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.sql__test-msg {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 12px;
  color: var(--is-text-secondary);
}
.sql__test-msg--ok {
  color: var(--is-success);
  font-weight: 600;
}
.sql__test-msg--bad {
  color: var(--is-danger);
  font-weight: 600;
}
.sql__layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 12px;
  min-height: 360px;
}
.sql__side {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 8px;
  overflow: auto;
  max-height: 480px;
  background: var(--is-surface-muted, #f8fafc);
}
.sql__side-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.sql__refresh {
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--is-text-tertiary);
  display: inline-flex;
}
.sql__side-empty {
  margin: 0;
  font-size: 12px;
  color: var(--is-text-tertiary);
  line-height: 1.4;
}
.sql__table {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--is-text);
  font-size: 12px;
}
.sql__table:hover {
  background: var(--is-surface-hover, #eef2f6);
}
.sql__table-name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
}
.sql__table-meta {
  color: var(--is-text-tertiary);
  font-size: 11px;
}
.sql__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.sql__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sql__name {
  flex: 1;
  min-width: 120px;
}
.sql__error {
  margin: 0;
  color: var(--is-danger);
  font-size: var(--is-text-sm);
}
.sql__warn {
  margin: 0;
  color: var(--is-warning, #b54708);
  font-size: var(--is-text-xs);
}
.sql__preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sql__stats {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.sql__scroll {
  overflow: auto;
  max-height: 240px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
}
.sql__table-grid {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 12px;
}
.sql__table-grid th,
.sql__table-grid td {
  border-bottom: 1px solid var(--is-border);
  border-right: 1px solid var(--is-border);
  padding: 6px 8px;
  text-align: left;
  overflow: hidden;
  max-width: 220px;
  vertical-align: top;
}
.sql__table-grid th {
  position: sticky;
  top: 0;
  background: var(--is-surface-muted, #f2f4f7);
  z-index: 1;
}
.sql__table-grid td .is-ellipsis {
  display: block;
  min-width: 0;
}
.sql__colhead {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
}

@media (max-width: 720px) {
  .sql__layout {
    grid-template-columns: 1fr;
  }
  .sql__form {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
