<template>
  <!-- Teleport to body so dialog is outside #workspace-main (Round 36). -->
  <Teleport to="body">
  <div
    v-if="modelValue"
    class="dialog-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="csv-dialog-title"
    data-ia-csv="1"
    @keydown.esc="onEsc"
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
            <div
              class="upload-zone"
              :class="{ 'is-dragover': dragOver }"
              role="button"
              tabindex="0"
              aria-label="拖放或选择 CSV 文件"
              :aria-describedby="fileStatusId"
              @click="openFilePicker"
              @keydown.enter.prevent="openFilePicker"
              @keydown.space.prevent="openFilePicker"
              @dragenter.prevent="onDragEnter"
              @dragover.prevent
              @dragleave.prevent="onDragLeave"
              @drop.prevent="onDrop"
            >
              <div class="upload-tip">拖放或选择 CSV 文件</div>
              <div v-if="fileName" class="upload-file" aria-hidden="true">{{ fileName }}</div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              class="sr-only-input"
              accept=".csv,text/csv"
              aria-label="选择 CSV 文件"
              @change="onFileInput"
            />
            <span :id="fileStatusId" class="sr-only" role="status" aria-live="polite">
              {{ fileStatus }}
            </span>
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
            <div class="preview-wrap" role="region" aria-label="CSV 预览">
              <table v-if="columns.length" class="preview-table">
                <thead>
                  <tr>
                    <th v-for="c in columns" :key="c.field" scope="col">{{ c.title }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in previewRows" :key="ri">
                    <td v-for="c in columns" :key="c.field">{{ formatPreviewCell(row[c.field]) }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="preview-empty">选择 CSV 后显示预览</div>
            </div>
          </div>
        </div>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn-primary" :disabled="!rows.length" @click="add">Add table</button>
      </footer>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from '@/shared/ui/feedback'
import { formatPreviewCell, slicePreviewRows } from '@/shared/ui/previewTable'
import { fileSelectedStatus, isCsvFileName } from '@/shared/ui/uploadStatus'
import { captureFocusEl, restoreFocusEl } from '@/shared/ui/focusRestore'
import { flowchartEmptyCsvFocusFallback } from '@/modules/flowchart/flowchartEmpty'
import { workspaceOverlayEscAllowed } from '@/modules/analysis/overlayEsc'
import { loadPapa, schedulePapaWarm } from '@/modules/table/csvParseChunk'
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
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null
let dragDepth = 0

const fileStatusId = 'csv-file-status'
const fileStatus = computed(() => fileSelectedStatus(fileName.value))

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function restoreFocusToTrigger() {
  // Prefer captured opener (flowchart empty CTA / Add data); else empty landmark.
  restoreFocusEl(restoreFocus, () => flowchartEmptyCsvFocusFallback())
  restoreFocus = null
}

function openDialog() {
  restoreFocus = captureFocusEl()
  document.body.style.overflow = 'hidden'
  schedulePapaWarm()
  void nextTick(() => {
    const list = focusables()
    const closeBtn = list.find((el) => el.classList.contains('icon-close'))
    ;(closeBtn || list[0])?.focus()
  })
}

function closeDialog() {
  document.body.style.overflow = ''
  resetForm()
  restoreFocusToTrigger()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) openDialog()
    else closeDialog()
  },
)

onMounted(() => {
  if (props.modelValue) openDialog()
})

onUnmounted(() => {
  document.body.style.overflow = ''
  restoreFocusEl(restoreFocus)
  restoreFocus = null
})

function resetForm() {
  tableName.value = ''
  rows.value = []
  columns.value = []
  previewRows.value = []
  fileName.value = ''
  dragOver.value = false
  dragDepth = 0
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function focusables(): HTMLElement[] {
  const root = panelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.offsetParent !== null,
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

function onEsc() {
  if (!workspaceOverlayEscAllowed()) return
  close()
}

function close() {
  emit('update:modelValue', false)
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function onDragEnter() {
  dragDepth += 1
  dragOver.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}

function onDrop(e: DragEvent) {
  dragDepth = 0
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) parseFile(file)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) parseFile(file)
}

function parseFile(file: File) {
  if (!isCsvFileName(file.name) && file.type !== 'text/csv') {
    toast('error', '请选择 CSV 文件')
    return
  }
  fileName.value = file.name
  tableName.value = file.name.replace(/\.csv$/i, '')
  void loadPapa().then(({ default: Papa }) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          toast('error', 'CSV 解析失败：' + res.errors[0].message)
          rows.value = []
          columns.value = []
          previewRows.value = []
          return
        }
        const data = withRowIds(res.data as Record<string, unknown>[])
        rows.value = data
        columns.value = buildColumnsFromRows(data)
        previewRows.value = slicePreviewRows(data, 20)
      },
      error: () => toast('error', 'CSV 解析失败'),
    })
  }).catch(() => toast('error', 'CSV 解析失败'))
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
.upload-zone {
  border: 1px dashed #c9cdd4;
  border-radius: 8px;
  background: #fafbfc;
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.upload-zone:hover,
.upload-zone:focus-visible {
  border-color: #3370ff;
  background: #f5f8ff;
  outline: none;
}
.upload-zone.is-dragover {
  border-color: #3370ff;
  background: #eef3ff;
}
.upload-tip {
  color: #646a73;
  font-size: 13px;
}
.upload-file {
  margin-top: 8px;
  font-size: 12px;
  color: #1f2329;
  word-break: break-all;
}
.sr-only-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.preview-title {
  font-size: 13px;
  margin-bottom: 6px;
  color: #646a73;
}
.preview-wrap {
  height: 280px;
  overflow: auto;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  background: #fff;
}
.preview-empty {
  padding: 24px 12px;
  text-align: center;
  color: #8f959e;
  font-size: 13px;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.preview-table th,
.preview-table td {
  border-bottom: 1px solid #eef0f2;
  border-right: 1px solid #eef0f2;
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preview-table th {
  position: sticky;
  top: 0;
  background: #f7f8fa;
  font-weight: 600;
  color: #646a73;
  z-index: 1;
}
.preview-table tbody tr:hover td {
  background: #f5f8ff;
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
