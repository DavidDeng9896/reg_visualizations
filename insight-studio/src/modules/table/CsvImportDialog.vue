<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import Papa from 'papaparse'
import type { DataType, Row } from '../../shared/types'
import { createTable, ensureRowIds } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, ISelect, ITextField, toast, type SelectOption } from '../../ui'
import { coerceValue, inferColumnTypes } from './csv'

/** CSV 导入对话框：拖放/选择文件 → 类型推断 → 预览前 50 行（可改列类型）→ 建表。 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAnalysisStore()

const fileName = ref('')
const tableName = ref('')
const headers = ref<string[]>([])
const dataRows = ref<string[][]>([])
const typeOverrides = ref<(DataType | undefined)[]>([])
const inferred = ref<DataType[]>([])
const parseError = ref('')
const parsing = ref(false)
const dragging = ref(false)

const PREVIEW_ROWS = 50
const LARGE_FILE = 5 * 1024 * 1024

const hasData = computed(() => headers.value.length > 0 && dataRows.value.length > 0)
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
]

function reset() {
  fileName.value = ''
  tableName.value = ''
  headers.value = []
  dataRows.value = []
  typeOverrides.value = []
  inferred.value = []
  parseError.value = ''
  parsing.value = false
}

function close() {
  emit('update:open', false)
  reset()
}

async function handleFile(file: File) {
  reset()
  if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
    parseError.value = '请选择 .csv 文件'
    return
  }
  fileName.value = file.name
  tableName.value = file.name.replace(/\.csv$/i, '')
  if (file.size > LARGE_FILE) {
    parsing.value = true
    await nextTick()
    // 让 loading 先渲染一帧
    await new Promise((r) => setTimeout(r, 30))
  }
  try {
    const text = await file.text()
    // 空文件：Papa 对空串会报 "Unable to auto-detect delimiting character"，
    // 先显式判空，给用户更准确的提示
    if (!text.trim()) {
      parseError.value = '文件为空'
      return
    }
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
    if (result.errors.length && result.data.length === 0) {
      parseError.value = `CSV 解析失败：${result.errors[0].message}`
      return
    }
    const rows = result.data.filter((r) => Array.isArray(r) && r.length > 0)
    if (rows.length < 2) {
      parseError.value = rows.length === 0 ? '文件为空' : '文件只有表头，没有数据行'
      return
    }
    headers.value = rows[0].map((h) => String(h ?? ''))
    dataRows.value = rows.slice(1) as string[][]
    inferred.value = inferColumnTypes(headers.value, dataRows.value).map((c) => c.dataType)
    typeOverrides.value = headers.value.map(() => undefined)
  } catch (e) {
    parseError.value = `CSV 解析失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    parsing.value = false
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void handleFile(file)
  input.value = ''
}

function setType(i: number, v: string | number) {
  typeOverrides.value[i] = v as DataType
}

function confirm() {
  if (!hasData.value || !store.current) return
  const name = tableName.value.trim() || 'Untitled table'
  const columns = inferColumnTypes(headers.value, []).map((c, i) => ({ ...c, dataType: columnTypes.value[i] }))
  const rows: Row[] = dataRows.value.map((line) => {
    const row: Row = {}
    columns.forEach((c, i) => {
      row[c.field] = coerceValue(line[i] ?? '', c.dataType)
    })
    return row
  })
  ensureRowIds(rows)
  const table = createTable(name, columns, rows, 'csv')
  store.mutate((a) => {
    a.tables.push(table)
  })
  store.select({ kind: 'table', tableId: table.id })
  toast.success(`已导入「${name}」（${rows.length} 行 × ${columns.length} 列）`)
  close()
}
</script>

<template>
  <IModal :open="open" title="Import CSV" :width="760" @update:open="emit('update:open', $event)">
    <div class="csv">
      <label
        class="csv__drop"
        :class="{ 'csv__drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input type="file" accept=".csv,text/csv" class="csv__file" aria-label="选择 CSV 文件" @change="onPick" />
        <IIcon name="upload" :size="22" />
        <span class="csv__drop-title">{{ fileName || '拖拽 CSV 文件到这里，或点击选择' }}</span>
        <span class="csv__drop-hint">首行作为表头；自动推断列类型</span>
      </label>

      <p v-if="parseError" class="csv__error">{{ parseError }}</p>
      <div v-if="parsing" class="csv__loading">正在解析大文件…</div>

      <template v-if="hasData && !parsing">
        <div class="csv__meta">
          <ITextField v-model="tableName" placeholder="表名" class="csv__name" aria-label="表名" />
          <span class="csv__stats">{{ dataRows.length }} 行 × {{ headers.length }} 列 · 预览前 {{ Math.min(PREVIEW_ROWS, dataRows.length) }} 行</span>
        </div>

        <div class="csv__preview">
          <table class="csv__table">
            <thead>
              <tr>
                <th v-for="(h, i) in headers" :key="i">
                  <div class="csv__colhead">
                    <span class="is-ellipsis" :title="h">{{ h || `Column ${i + 1}` }}</span>
                    <ISelect
                      :model-value="columnTypes[i]"
                      :options="typeOptions"
                      size="sm"
                      :aria-label="`列 ${h} 类型`"
                      @update:model-value="setType(i, $event)"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, r) in previewRows" :key="r">
                <td v-for="(h, i) in headers" :key="i" class="csv__cell">
                  <span class="is-ellipsis">{{ line[i] ?? '' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <template #footer>
      <IButton @click="close">取消</IButton>
      <IButton variant="primary" :disabled="!hasData || parsing" @click="confirm">Add table</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.csv {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.csv__drop {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 16px;
  border: 1.5px dashed var(--is-border-strong);
  border-radius: var(--is-radius);
  color: var(--is-text-secondary);
  cursor: pointer;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.csv__drop:hover,
.csv__drop--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.csv__file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.csv__drop-title {
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.csv__drop-hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.csv__error {
  color: var(--is-danger);
  font-size: var(--is-text-sm);
  background: var(--is-danger-soft);
  border-radius: var(--is-radius-sm);
  padding: 8px 12px;
}
.csv__loading {
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  text-align: center;
  padding: 12px;
}
.csv__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.csv__name {
  width: 240px;
}
.csv__stats {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.csv__preview {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: auto;
  max-height: 320px;
}
.csv__table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--is-text-xs);
}
.csv__table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
  padding: 6px 8px;
  text-align: left;
  font-weight: 600;
  min-width: 120px;
}
.csv__colhead {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.csv__table td {
  border-bottom: 1px solid var(--is-border);
  padding: 5px 8px;
  color: var(--is-text-secondary);
  max-width: 200px;
}
.csv__cell span {
  display: block;
  max-width: 200px;
}
</style>
