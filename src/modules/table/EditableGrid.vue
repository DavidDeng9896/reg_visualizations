<template>
  <div class="grid-wrap" tabindex="0" @keydown="onKey" @paste="onPaste">
    <div class="bar">
      <el-button size="small" :disabled="!editable" @click="insertRow">插入行</el-button>
      <el-button size="small" :disabled="!editable" @click="removeRows">删除选中行</el-button>
      <el-button size="small" :disabled="!editable" @click="undo">Undo</el-button>
      <el-button size="small" :disabled="!editable" @click="redo">Redo</el-button>
      <span v-if="!editable" class="hint hint-readonly" role="status">{{ readOnlyHint }}</span>
      <span class="hint">双击编辑 · Ctrl/Cmd+C/V 复制粘贴（TSV）· 不支持合并单元格</span>
    </div>
    <vxe-table
      ref="tableRef"
      border
      height="100%"
      :data="rows"
      :scroll-y="{ enabled: true, gt: 40 }"
      :edit-config="editable ? { trigger: 'dblclick', mode: 'cell', showStatus: true } : undefined"
      :checkbox-config="{ highlight: true }"
      :mouse-config="{ selected: true }"
      :keyboard-config="{ isClip: true, isEdit: editable }"
      keep-source
      :show-overflow="'title'"
      @edit-closed="onEditClosed"
      @cell-selected="onCellSelected"
    >
      <vxe-column v-if="editable" type="checkbox" width="48" />
      <vxe-column
        v-for="c in columns"
        :key="c.field"
        :field="c.field"
        :title="c.title"
        :edit-render="editable ? { name: 'input' } : undefined"
        min-width="120"
      />
    </vxe-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { TableColumn } from '@/shared/types/analysis'
import { coerceValue } from '@/shared/utils/schema'

const props = defineProps<{
  columns: TableColumn[]
  modelValue: Record<string, unknown>[]
  editable: boolean
  readOnlyHint?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown>[]] }>()

const readOnlyHint = computed(
  () => props.readOnlyHint || '当前表格只读；源表可编辑，或将视图提升为表',
)

const tableRef = ref<{
  getCheckboxRecords: () => Record<string, unknown>[]
  getSelectedCell?: () => { row: Record<string, unknown>; column: { field: string } } | null
} | null>(null)
const rows = ref<Record<string, unknown>[]>([])
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const anchor = ref<{ rowIndex: number; field: string } | null>(null)

watch(
  () => props.modelValue,
  (v) => {
    rows.value = v.map((r) => ({ ...r }))
  },
  { immediate: true, deep: true },
)

function pushUndo() {
  undoStack.value.push(JSON.stringify(rows.value))
  if (undoStack.value.length > 30) undoStack.value.shift()
  redoStack.value = []
}

function commit() {
  emit(
    'update:modelValue',
    rows.value.map((r) => ({ ...r })),
  )
}

function onEditClosed({ row, column }: { row: Record<string, unknown>; column: { field: string } }) {
  const col = props.columns.find((c) => c.field === column.field)
  if (!col) return
  const next = coerceValue(row[column.field], col.dataType)
  if (col.dataType === 'number' && next !== '' && next != null && Number.isNaN(Number(next))) {
    ElMessage.warning('数值类型无效，已还原')
    return
  }
  pushUndo()
  row[column.field] = next
  commit()
}

function onCellSelected(params: { row: Record<string, unknown>; column: { field: string } }) {
  const idx = rows.value.findIndex((r) => r.__rowId === params.row.__rowId)
  if (idx >= 0) anchor.value = { rowIndex: idx, field: params.column.field }
}

function insertRow() {
  pushUndo()
  rows.value.push({ __rowId: crypto.randomUUID() })
  commit()
}

function removeRows() {
  const $table = tableRef.value
  if (!$table) return
  const selected = $table.getCheckboxRecords() as Record<string, unknown>[]
  if (!selected.length) {
    ElMessage.info('请先勾选行')
    return
  }
  pushUndo()
  const ids = new Set(selected.map((r) => r.__rowId))
  rows.value = rows.value.filter((r) => !ids.has(r.__rowId))
  commit()
}

function undo() {
  const prev = undoStack.value.pop()
  if (!prev) return
  redoStack.value.push(JSON.stringify(rows.value))
  rows.value = JSON.parse(prev)
  commit()
}

function redo() {
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(JSON.stringify(rows.value))
  rows.value = JSON.parse(next)
  commit()
}

function onPaste(e: ClipboardEvent) {
  if (!props.editable) return
  const text = e.clipboardData?.getData('text/plain')
  if (!text || !text.includes('\t') && !text.includes('\n')) return
  e.preventDefault()
  const matrix = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.length)
    .map((line) => line.split('\t'))
  if (!matrix.length) return

  const startRow = anchor.value?.rowIndex ?? 0
  const startField = anchor.value?.field || props.columns[0]?.field
  const startCol = Math.max(
    0,
    props.columns.findIndex((c) => c.field === startField),
  )

  pushUndo()
  for (let r = 0; r < matrix.length; r++) {
    const rowIndex = startRow + r
    while (rowIndex >= rows.value.length) {
      rows.value.push({ __rowId: crypto.randomUUID() })
    }
    for (let c = 0; c < matrix[r].length; c++) {
      const col = props.columns[startCol + c]
      if (!col) break
      rows.value[rowIndex][col.field] = coerceValue(matrix[r][c], col.dataType)
    }
  }
  commit()
  ElMessage.success(`已粘贴 ${matrix.length}×${matrix[0].length} 区域`)
}

function onKey(e: KeyboardEvent) {
  if (!props.editable) return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault()
    redo()
  } else if (mod && e.key.toLowerCase() === 'c') {
    // allow native copy; also provide TSV of checkbox selection
    const selected = tableRef.value?.getCheckboxRecords?.() || []
    if (selected.length) {
      e.preventDefault()
      const fields = props.columns.map((c) => c.field)
      const tsv = [
        fields.join('\t'),
        ...selected.map((row) => fields.map((f) => String(row[f] ?? '')).join('\t')),
      ].join('\n')
      navigator.clipboard.writeText(tsv)
      ElMessage.success(`已复制 ${selected.length} 行`)
    }
  }
}
</script>

<style scoped>
.grid-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  outline: none;
}
.bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--ia-border);
  flex-wrap: wrap;
}
.hint {
  font-size: 12px;
  color: #909399;
}
.hint-readonly {
  color: #ad6800;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 600;
}
</style>
