<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { DataType } from '../../shared/types'
import { IButton, IIcon, IModal, ISelect, ITextField, type SelectOption } from '../../ui'
import { inferColumnTypes } from './csv'
import { commitImportedTable } from './commitImport'
import { listSheetInfo, parseExcelFile, type ExcelParseResult } from './excel'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const fileName = ref('')
const tableName = ref('')
const sheetName = ref('')
const sheetOptions = ref<SelectOption[]>([])
const parsed = ref<ExcelParseResult | null>(null)
const headers = ref<string[]>([])
const dataRows = ref<string[][]>([])
const typeOverrides = ref<(DataType | undefined)[]>([])
const inferred = ref<DataType[]>([])
const parseError = ref('')
const parsing = ref(false)
const dragging = ref(false)

const PREVIEW_ROWS = 50

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
  { value: 'structure', label: 'Structure', icon: 'type-structure' },
]

function reset() {
  fileName.value = ''
  tableName.value = ''
  sheetName.value = ''
  sheetOptions.value = []
  parsed.value = null
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

function applySheet(name: string) {
  const g = parsed.value?.sheets[name]
  if (!g) {
    parseError.value = `工作表「${name}」不存在`
    return
  }
  sheetName.value = name
  if (!g.dataRows.length) {
    headers.value = []
    dataRows.value = []
    parseError.value = `工作表「${name}」没有数据行（需要表头 + 至少一行）`
    return
  }
  parseError.value = ''
  headers.value = g.headers
  dataRows.value = g.dataRows
  inferred.value = inferColumnTypes(headers.value, dataRows.value).map((c) => c.dataType)
  typeOverrides.value = headers.value.map(() => undefined)
  if (!tableName.value.trim()) {
    tableName.value = `${fileName.value.replace(/\.(xlsx|xls)$/i, '')}_${name}`.replace(/\s+/g, '_')
  }
}

async function handleFile(file: File) {
  reset()
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    parseError.value = '请选择 .xlsx 或 .xls 文件'
    return
  }
  fileName.value = file.name
  tableName.value = file.name.replace(/\.(xlsx|xls)$/i, '')
  parsing.value = true
  await nextTick()
  try {
    const result = await parseExcelFile(file)
    parsed.value = result
    const infos = listSheetInfo(result)
    sheetOptions.value = infos.map((s) => ({
      value: s.name,
      label: `${s.name}（${s.rowCount} 行 × ${s.colCount} 列）`,
    }))
    if (!result.sheetNames.length) {
      parseError.value = '工作簿中没有工作表'
      return
    }
    applySheet(result.sheetNames[0])
  } catch (e) {
    parseError.value = `Excel 解析失败：${e instanceof Error ? e.message : '未知错误'}`
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

function onSheetChange(v: string | number) {
  applySheet(String(v))
}

function confirm() {
  if (!hasData.value) return
  const ok = commitImportedTable({
    name: tableName.value,
    headers: headers.value,
    dataRows: dataRows.value,
    columnTypes: columnTypes.value,
    stepType: 'upload-xlsx',
    stepConfig: { fileName: fileName.value, sheetName: sheetName.value },
    sourceLabel: `Excel · ${sheetName.value}`,
  })
  if (ok) close()
}

watch(
  () => sheetName.value,
  () => {
    /* sheet 切换由 ISelect 触发 */
  },
)
</script>

<template>
  <IModal :open="open" title="Import Excel" :width="800" @update:open="emit('update:open', $event)">
    <div class="xlsx">
      <label
        class="xlsx__drop"
        :class="{ 'xlsx__drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="xlsx__file" aria-label="选择 Excel 文件" @change="onPick" />
        <IIcon name="upload" :size="22" />
        <span class="xlsx__drop-title">{{ fileName || '拖拽 Excel 到这里，或点击选择' }}</span>
        <span class="xlsx__drop-hint">支持 .xlsx / .xls；首行作为表头</span>
      </label>

      <p v-if="parseError" class="xlsx__error">{{ parseError }}</p>
      <div v-if="parsing" class="xlsx__loading">正在解析 Excel…</div>

      <template v-if="parsed && !parsing">
        <div class="xlsx__meta">
          <ITextField v-model="tableName" placeholder="表名" class="xlsx__name" aria-label="表名" />
          <ISelect
            :model-value="sheetName"
            :options="sheetOptions"
            size="sm"
            class="xlsx__sheet"
            aria-label="工作表"
            @update:model-value="onSheetChange"
          />
          <span v-if="hasData" class="xlsx__stats">
            {{ dataRows.length }} 行 × {{ headers.length }} 列 · 预览前 {{ Math.min(PREVIEW_ROWS, dataRows.length) }} 行
          </span>
        </div>

        <div v-if="hasData" class="xlsx__preview">
          <table class="xlsx__table">
            <thead>
              <tr>
                <th v-for="(h, i) in headers" :key="i">
                  <div class="xlsx__colhead">
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
                <td v-for="(h, i) in headers" :key="i" class="xlsx__cell">
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
.xlsx {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.xlsx__drop {
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
}
.xlsx__drop:hover,
.xlsx__drop--active {
  border-color: var(--is-accent);
  background: color-mix(in srgb, var(--is-accent) 6%, transparent);
}
.xlsx__file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.xlsx__drop-title {
  font-weight: 500;
  color: var(--is-text);
}
.xlsx__drop-hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.xlsx__error {
  color: var(--is-danger);
  font-size: var(--is-text-sm);
  margin: 0;
}
.xlsx__loading {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.xlsx__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.xlsx__name {
  flex: 1;
  min-width: 160px;
}
.xlsx__sheet {
  min-width: 180px;
}
.xlsx__stats {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.xlsx__preview {
  overflow: auto;
  max-height: 360px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
}
.xlsx__table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 12px;
}
.xlsx__table th,
.xlsx__table td {
  border-bottom: 1px solid var(--is-border);
  border-right: 1px solid var(--is-border);
  padding: 6px 8px;
  text-align: left;
  max-width: 180px;
}
.xlsx__table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-muted, #f2f4f7);
  z-index: 1;
}
.xlsx__colhead {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.xlsx__cell {
  color: var(--is-text-secondary);
}
</style>
