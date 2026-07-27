<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { DataType } from '../../shared/types'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, ISelect, ITextField, type SelectOption } from '../../ui'
import { inferColumnTypes } from './csv'
import { commitImportedTable, objectRowsToGrid } from './commitImport'
import SqlEditor from './SqlEditor.vue'
import { buildSqlSchema, runSqlQuery, schemaForEditor } from './sqlQuery'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const sql = ref('SELECT 1 AS id, \'demo\' AS name')
const tableName = ref('sql_result')
const running = ref(false)
const runError = ref('')
const headers = ref<string[]>([])
const dataRows = ref<string[][]>([])
const typeOverrides = ref<(DataType | undefined)[]>([])
const inferred = ref<DataType[]>([])
const lastSql = ref('')

const PREVIEW_ROWS = 50

const tables = computed(() => current.value?.tables ?? [])
const schemaList = computed(() => buildSqlSchema(tables.value))
const editorSchema = computed(() => schemaForEditor(tables.value))

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

function resetResult() {
  headers.value = []
  dataRows.value = []
  typeOverrides.value = []
  inferred.value = []
  runError.value = ''
  lastSql.value = ''
}

function close() {
  emit('update:open', false)
}

function insertTableRef(sqlName: string) {
  const tip = `SELECT * FROM ${sqlName} LIMIT 100`
  sql.value = tip
}

function run() {
  running.value = true
  runError.value = ''
  try {
    const result = runSqlQuery(sql.value, tables.value)
    lastSql.value = sql.value.trim()
    if (!result.rows.length) {
      const { headers: h, dataRows: d } = objectRowsToGrid([])
      headers.value = result.columns.length ? result.columns : h
      dataRows.value = d
      if (!headers.value.length) {
        runError.value = '查询成功，但没有返回行'
      } else {
        runError.value = '查询成功，但结果为空（0 行）'
      }
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

function confirm() {
  if (!hasData.value || !dataRows.value.length) return
  const ok = commitImportedTable({
    name: tableName.value,
    headers: headers.value,
    dataRows: dataRows.value,
    columnTypes: columnTypes.value,
    stepType: 'query-sql',
    stepConfig: { sql: lastSql.value || sql.value },
    sourceLabel: 'SQL',
  })
  if (ok) close()
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    // 打开时若有表，给一个更实用的默认查询
    if (schemaList.value.length && /^SELECT 1 AS id/i.test(sql.value.trim())) {
      sql.value = `SELECT * FROM ${schemaList.value[0].sqlName} LIMIT 100`
    }
  },
)
</script>

<template>
  <IModal :open="open" title="Import from SQL" :width="880" @update:open="emit('update:open', $event)">
    <div class="sql">
      <p class="sql__hint">
        在浏览器内执行只读 <code>SELECT</code>。可查询当前 Analysis 中的表（左侧点表名插入），也支持无表常量查询。
        快捷键 <kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd> 运行。
      </p>

      <div class="sql__layout">
        <aside class="sql__side">
          <div class="sql__side-title">可用表</div>
          <p v-if="!schemaList.length" class="sql__side-empty">暂无表。可先导入 CSV/Excel，或直接写常量 SELECT。</p>
          <button
            v-for="t in schemaList"
            :key="t.sqlName"
            type="button"
            class="sql__table"
            :title="t.name === t.sqlName ? t.sqlName : `${t.name} → ${t.sqlName}`"
            @click="insertTableRef(t.sqlName)"
          >
            <IIcon name="database" :size="13" />
            <span class="sql__table-name is-ellipsis">{{ t.sqlName }}</span>
            <span class="sql__table-meta">{{ t.columns.length }} 列</span>
          </button>
        </aside>

        <div class="sql__main">
          <SqlEditor v-model="sql" :schema="editorSchema" @run="run" />
          <div class="sql__actions">
            <IButton size="sm" variant="secondary" :disabled="running" @click="run">
              {{ running ? '运行中…' : '运行' }}
            </IButton>
            <ITextField v-model="tableName" size="sm" class="sql__name" placeholder="导入后的表名" aria-label="表名" />
          </div>
          <p v-if="runError" class="sql__error">{{ runError }}</p>

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
                      <span class="is-ellipsis">{{ line[i] ?? '' }}</span>
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
      <IButton variant="primary" :disabled="!hasData || !dataRows.length || running" @click="confirm">Add table</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.sql {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-size: 11px;
  font-weight: 600;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
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
  padding: 6px 6px;
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
  max-width: 160px;
}
.sql__table-grid th {
  position: sticky;
  top: 0;
  background: var(--is-surface-muted, #f2f4f7);
  z-index: 1;
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
}
</style>
