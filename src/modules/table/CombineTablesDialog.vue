<template>
  <!-- Teleport to body so dialog is outside #workspace-main (Round 36). -->
  <Teleport to="body">
  <div
    v-if="modelValue"
    class="dialog-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="combine-dialog-title"
    data-ia-combine="1"
    @keydown.esc="onEsc"
    @keydown="onTrapKeydown"
  >
    <button type="button" class="dialog-backdrop" tabindex="-1" aria-label="关闭对话框" @click="close" />
    <div class="dialog-panel" ref="panelRef">
      <header class="dialog-header">
        <h2 id="combine-dialog-title">By combining tables</h2>
        <button type="button" class="icon-close" aria-label="关闭" @click="close">×</button>
      </header>
      <div class="dialog-body">
        <div class="form-grid">
          <label class="field">
            <span class="field-label">左表</span>
            <select v-model="leftId" class="native-field-select" aria-label="左表">
              <option value="" disabled>请选择</option>
              <option v-for="t in tables" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">右表</span>
            <select v-model="rightId" class="native-field-select" aria-label="右表">
              <option value="" disabled>请选择</option>
              <option v-for="t in tables" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">连接类型</span>
            <select v-model="joinType" class="native-field-select" aria-label="连接类型">
              <option value="left">Left Join</option>
              <option value="inner">Inner Join</option>
              <option value="right">Right Join</option>
              <option value="full">Full Join</option>
              <option value="append">Append</option>
            </select>
          </label>
          <template v-if="joinType !== 'append'">
            <label class="field">
              <span class="field-label">左连接键</span>
              <select
                v-model="leftKeys"
                multiple
                class="native-field-select native-multi"
                aria-label="左连接键"
                :aria-describedby="leftKeysStatusId"
              >
                <option v-for="c in leftCols" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
              <span :id="leftKeysStatusId" class="sr-only" role="status" aria-live="polite">
                {{ leftKeysStatus }}
              </span>
            </label>
            <label class="field">
              <span class="field-label">右连接键</span>
              <select
                v-model="rightKeys"
                multiple
                class="native-field-select native-multi"
                aria-label="右连接键"
                :aria-describedby="rightKeysStatusId"
              >
                <option v-for="c in rightCols" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
              <span :id="rightKeysStatusId" class="sr-only" role="status" aria-live="polite">
                {{ rightKeysStatus }}
              </span>
            </label>
          </template>
          <label class="field">
            <span class="field-label">新表名称</span>
            <input v-model="name" type="text" class="native-input" aria-label="新表名称" autocomplete="off" />
          </label>
        </div>
        <div class="preview-title">预览（前 20 行）{{ warning }}</div>
        <div class="preview-wrap" role="region" aria-label="合并预览">
          <table v-if="previewCols.length" class="preview-table">
            <thead>
              <tr>
                <th v-for="c in previewCols" :key="c.field" scope="col">{{ c.title }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in preview" :key="ri">
                <td v-for="c in previewCols" :key="c.field">{{ formatPreviewCell(row[c.field]) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="preview-empty">选择表与连接条件后显示预览</div>
        </div>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn-primary" :disabled="!canAdd" @click="add">Add table</button>
      </footer>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from '@/shared/ui/feedback'
import { formatPreviewCell, slicePreviewRows } from '@/shared/ui/previewTable'
import { multiSelectCountStatus } from '@/shared/ui/selectStatus'
import { captureFocusEl, restoreFocusEl } from '@/shared/ui/focusRestore'
import { flowchartEmptyCombineFocusFallback } from '@/modules/flowchart/flowchartEmpty'
import { workspaceOverlayEscAllowed } from '@/modules/analysis/overlayEsc'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { combineTables } from '@/modules/table/join'
import type { JoinType, TableColumn } from '@/shared/types/analysis'
import { uid } from '@/shared/utils/id'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()

const leftId = ref('')
const rightId = ref('')
const joinType = ref<JoinType>('left')
const leftKeys = ref<string[]>([])
const rightKeys = ref<string[]>([])
const name = ref('Combined table')
const preview = ref<Record<string, unknown>[]>([])
const previewCols = ref<TableColumn[]>([])
const warning = ref('')
const panelRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const leftKeysStatusId = 'combine-left-keys-status'
const rightKeysStatusId = 'combine-right-keys-status'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const tables = computed(() => store.current?.tables || [])
const leftCols = computed(() => tables.value.find((t) => t.id === leftId.value)?.columns || [])
const rightCols = computed(() => tables.value.find((t) => t.id === rightId.value)?.columns || [])
const leftKeysStatus = computed(() => multiSelectCountStatus(leftKeys.value.length, '左连接键'))
const rightKeysStatus = computed(() => multiSelectCountStatus(rightKeys.value.length, '右连接键'))

const canAdd = computed(() => {
  if (!leftId.value || !rightId.value || !name.value) return false
  if (joinType.value === 'append') return true
  return leftKeys.value.length && leftKeys.value.length === rightKeys.value.length
})

watch([leftId, rightId, joinType, leftKeys, rightKeys], rebuild, { deep: true })

function restoreFocusToTrigger() {
  restoreFocusEl(restoreFocus, () => flowchartEmptyCombineFocusFallback())
  restoreFocus = null
}

function openDialog() {
  restoreFocus = captureFocusEl()
  document.body.style.overflow = 'hidden'
  void nextTick(() => {
    const list = focusables()
    const closeBtn = list.find((el) => el.classList.contains('icon-close'))
    ;(closeBtn || list[0])?.focus()
  })
}

function closeDialog() {
  document.body.style.overflow = ''
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

function rebuild() {
  warning.value = ''
  preview.value = []
  previewCols.value = []
  const L = tables.value.find((t) => t.id === leftId.value)
  const R = tables.value.find((t) => t.id === rightId.value)
  if (!L || !R) return
  try {
    const result = combineTables({
      leftColumns: L.columns,
      leftRows: L.rows,
      rightColumns: R.columns,
      rightRows: R.rows,
      joinType: joinType.value,
      leftKeys: leftKeys.value,
      rightKeys: rightKeys.value,
    })
    previewCols.value = result.columns
    preview.value = slicePreviewRows(result.rows, 20)
    if (!result.rows.length) warning.value = '（警告：结果为空）'
  } catch (e) {
    warning.value = String(e)
  }
}

function close() {
  emit('update:modelValue', false)
}

function add() {
  const L = tables.value.find((t) => t.id === leftId.value)!
  const R = tables.value.find((t) => t.id === rightId.value)!
  const result = combineTables({
    leftColumns: L.columns,
    leftRows: L.rows,
    rightColumns: R.columns,
    rightRows: R.rows,
    joinType: joinType.value,
    leftKeys: leftKeys.value,
    rightKeys: rightKeys.value,
  })
  store.addTable({
    id: uid('tbl'),
    name: name.value,
    source: {
      type: 'combine',
      joinType: joinType.value,
      leftTableId: L.id,
      rightTableId: R.id,
      leftKeys: leftKeys.value,
      rightKeys: rightKeys.value,
    },
    columns: result.columns,
    rows: result.rows,
    tableFilters: [],
    views: [],
  })
  toast('success', '已添加合并表')
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
  width: min(780px, 100%);
  max-height: min(90vh, 920px);
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
.icon-close:focus-visible {
  outline: 2px solid var(--ia-accent, #2f6fed);
  outline-offset: 2px;
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
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.preview-title {
  margin: 12px 0 6px;
  color: #646a73;
  font-size: 13px;
}
.preview-wrap {
  height: 220px;
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
  max-width: 140px;
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
.native-field-select,
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
.native-field-select:focus-visible,
.native-input:focus-visible {
  outline: 2px solid #3370ff;
  outline-offset: 1px;
}
.native-multi {
  height: auto;
  min-height: 88px;
  padding: 4px 6px;
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
.btn:focus-visible {
  outline: 2px solid var(--ia-accent, #2f6fed);
  outline-offset: 2px;
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
