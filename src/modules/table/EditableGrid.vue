<template>
  <div class="grid-wrap" @keydown="onKey">
    <div class="bar">
      <el-button size="small" :disabled="!editable" @click="insertRow">插入行</el-button>
      <el-button size="small" :disabled="!editable" @click="removeRows">删除选中行</el-button>
      <el-button size="small" :disabled="!editable" @click="undo">Undo</el-button>
      <el-button size="small" :disabled="!editable" @click="redo">Redo</el-button>
      <span v-if="!editable" class="hint">当前视图含过滤/转换，表格只读；可提升为表后编辑</span>
      <span class="hint">双击编辑 · Ctrl/Cmd+C/V 复制粘贴 · 不支持合并单元格</span>
    </div>
    <vxe-table
      ref="tableRef"
      border
      height="100%"
      :data="rows"
      :edit-config="editable ? { trigger: 'dblclick', mode: 'cell', showStatus: true } : undefined"
      :checkbox-config="{ highlight: true }"
      :mouse-config="{ selected: true }"
      :keyboard-config="{ isClip: true, isEdit: editable }"
      keep-source
      @edit-closed="onEditClosed"
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
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { TableColumn } from '@/shared/types/analysis'
import { coerceValue } from '@/shared/utils/schema'

const props = defineProps<{
  columns: TableColumn[]
  modelValue: Record<string, unknown>[]
  editable: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown>[]] }>()

const tableRef = ref<{ getCheckboxRecords: () => Record<string, unknown>[] } | null>(null)
const rows = ref<Record<string, unknown>[]>([])
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])

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
  emit('update:modelValue', rows.value.map((r) => ({ ...r })))
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

function onKey(e: KeyboardEvent) {
  if (!props.editable) return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault()
    redo()
  }
}
</script>

<style scoped>
.grid-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
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
</style>
