<template>
  <div
    v-if="modelValue"
    class="dialog-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="csv-dialog-title"
    @keydown.esc="close"
    @keydown="onTrapKeydown"
  >
    <button type="button" class="dialog-backdrop" tabindex="-1" aria-label="关闭对话框" @click="close" />
    <div class="dialog-panel" ref="panelRef">
      <header class="dialog-header">
        <h2 id="csv-dialog-title">Upload CSV</h2>
        <button type="button" class="icon-close" aria-label="关闭" @click="close">×</button>
      </header>
      <div class="dialog-body">
        <div class="grid">
          <div>
            <el-upload
              drag
              :auto-upload="false"
              accept=".csv,text/csv"
              :show-file-list="false"
              :on-change="onFile"
            >
              <div class="upload-tip">拖放或选择 CSV 文件</div>
            </el-upload>
            <label class="field" style="margin-top: 12px">
              <span class="field-label">Name table</span>
              <input
                v-model="tableName"
                type="text"
                class="native-input"
                aria-label="Name table"
                autocomplete="off"
              />
            </label>
          </div>
          <div>
            <div class="preview-title">预览（前 20 行）</div>
            <el-table :data="previewRows" height="280" size="small" border>
              <el-table-column
                v-for="c in columns"
                :key="c.field"
                :prop="c.field"
                :label="c.title"
                min-width="100"
              />
            </el-table>
          </div>
        </div>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn-primary" :disabled="!rows.length" @click="add">Add table</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Papa from 'papaparse'
import type { UploadFile } from 'element-plus'
import { toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { buildColumnsFromRows, withRowIds } from '@/shared/utils/schema'
import { uid } from '@/shared/utils/id'
import type { TableColumn } from '@/shared/types/analysis'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()

const tableName = ref('')
const rows = ref<Record<string, unknown>[]>([])
const columns = ref<TableColumn[]>([])
const previewRows = ref<Record<string, unknown>[]>([])
const fileName = ref('')
const panelRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      void nextTick(() => focusables()[0]?.focus())
    } else {
      document.body.style.overflow = ''
      if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus()
      restoreFocus = null
    }
  },
)

onMounted(() => {
  if (props.modelValue) {
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    void nextTick(() => focusables()[0]?.focus())
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus()
})

function focusables(): HTMLElement[] {
  const root = panelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

function onTrapKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = focusables()
  if (list.length < 2) return
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first || !list.includes(active as HTMLElement)) {
      e.preventDefault()
      last.focus()
    }
  } else if (active === last || !list.includes(active as HTMLElement)) {
    e.preventDefault()
    first.focus()
  }
}

function close() {
  emit('update:modelValue', false)
}

function onFile(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  fileName.value = raw.name
  tableName.value = raw.name.replace(/\.csv$/i, '')
  Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      if (res.errors?.length) {
        toast('error', 'CSV 解析失败：' + res.errors[0].message)
        rows.value = []
        return
      }
      const data = withRowIds(res.data as Record<string, unknown>[])
      rows.value = data
      columns.value = buildColumnsFromRows(data)
      previewRows.value = data.slice(0, 20)
    },
    error: () => toast('error', 'CSV 解析失败'),
  })
}

function add() {
  store.addTable({
    id: uid('tbl'),
    name: tableName.value || 'Table',
    source: { type: 'csv', fileName: fileName.value },
    columns: columns.value,
    rows: rows.value,
    tableFilters: [],
    views: [],
  })
  toast('success', '已添加表')
  close()
}
</script>

<style scoped>
.dialog-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.dialog-panel {
  position: relative;
  z-index: 1;
  width: min(720px, 100%);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #dee0e3;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 8px;
  flex-shrink: 0;
}
.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.icon-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #8f959e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.icon-close:hover {
  color: #1f2329;
  background: #f2f3f5;
}
.dialog-body {
  padding: 8px 18px 12px;
  overflow: auto;
  flex: 1;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  flex-shrink: 0;
  border-top: 1px solid #eef0f2;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.upload-tip {
  padding: 24px;
  color: #646a73;
}
.preview-title {
  font-size: 13px;
  margin-bottom: 6px;
  color: #646a73;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  color: #646a73;
}
.native-input {
  height: 32px;
  border: 1px solid #d0d3d6;
  border-radius: 6px;
  padding: 0 8px;
  background: #fff;
  color: #1f2329;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
}
.native-input:focus-visible {
  outline: 2px solid #3370ff;
  outline-offset: 1px;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d0d3d6;
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
  font-size: 13px;
}
.btn:hover:not(:disabled) {
  border-color: #3370ff;
  color: #3370ff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #3370ff;
  border-color: #3370ff;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
  color: #fff;
}
</style>
