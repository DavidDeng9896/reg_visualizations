<template>
  <div
    v-if="modelValue"
    class="dialog-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="transform-dialog-title"
    @keydown.esc="close"
    @keydown="onTrapKeydown"
  >
    <button type="button" class="dialog-backdrop" tabindex="-1" aria-label="关闭对话框" @click="close" />
    <div class="dialog-panel" ref="panelRef">
      <header class="dialog-header">
        <h2 id="transform-dialog-title">过滤与转换</h2>
        <button type="button" class="icon-close" aria-label="关闭" @click="close">×</button>
      </header>
      <div class="dialog-body">
        <template v-if="store.selectedView">
          <h4>视图过滤</h4>
          <div v-for="(f, i) in filters" :key="f.id" class="row">
            <select v-model="f.field" class="native-field-select" style="width: 140px" aria-label="过滤字段">
              <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
            </select>
            <select v-model="f.op" class="native-field-select" style="width: 120px" aria-label="过滤运算符">
              <option value="eq">等于</option>
              <option value="neq">不等于</option>
              <option value="contains">包含</option>
              <option value="empty">为空</option>
              <option value="notEmpty">非空</option>
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
            </select>
            <input
              v-model="f.value"
              type="text"
              class="native-input"
              style="width: 140px"
              aria-label="过滤值"
              :disabled="f.op === 'empty' || f.op === 'notEmpty'"
            />
            <button type="button" class="btn" @click="filters.splice(i, 1)">删</button>
          </div>
          <button type="button" class="btn btn-sm" @click="addFilter">+ 过滤</button>

          <h4 style="margin-top: 16px">转换步骤</h4>
          <div v-for="(t, i) in transforms" :key="t.id" class="row transform">
            <select
              class="native-field-select"
              style="width: 130px"
              aria-label="转换类型"
              :value="t.kind"
              @change="onKindChange(t, $event)"
            >
              <option value="select">选列</option>
              <option value="rename">重命名</option>
              <option value="derived">派生列</option>
              <option value="dedupe">去重</option>
              <option value="sort">排序</option>
            </select>
            <template v-if="t.kind === 'select' || t.kind === 'dedupe'">
              <select
                v-model="t.config.fields"
                multiple
                class="native-field-select native-multi"
                style="width: 280px"
                aria-label="转换列"
              >
                <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </template>
            <template v-else-if="t.kind === 'rename'">
              <select v-model="t.config.from" class="native-field-select" style="width: 120px" aria-label="重命名源列">
                <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
              <input
                v-model="t.config.to"
                type="text"
                class="native-input"
                style="width: 120px"
                placeholder="新 field"
                aria-label="重命名目标字段"
              />
            </template>
            <template v-else-if="t.kind === 'derived'">
              <input
                v-model="t.config.field"
                type="text"
                class="native-input"
                style="width: 100px"
                placeholder="新列名"
                aria-label="派生列名"
              />
              <input
                v-model="t.config.expr"
                type="text"
                class="native-input"
                style="width: 220px"
                placeholder="如 colA + colB 或 concat(a,b)"
                aria-label="派生表达式"
              />
            </template>
            <template v-else-if="t.kind === 'sort'">
              <select
                class="native-field-select"
                style="width: 140px"
                aria-label="排序字段"
                :value="sortField"
                @change="onSortField($event, t)"
              >
                <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
              <select
                class="native-field-select"
                style="width: 100px"
                aria-label="排序方向"
                :value="sortOrder"
                @change="onSortOrder($event, t)"
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
            </template>
            <button type="button" class="btn" @click="transforms.splice(i, 1)">删</button>
            <button v-if="i" type="button" class="btn" @click="move(i, -1)">上</button>
            <button v-if="i < transforms.length - 1" type="button" class="btn" @click="move(i, 1)">下</button>
          </div>
          <button type="button" class="btn btn-sm" @click="addTransform">+ 转换</button>
          <div v-if="error" class="err" role="alert">{{ error }}</div>
        </template>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn-primary" @click="save">Save</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { FilterCondition, TransformStep } from '@/shared/types/analysis'
import { uid } from '@/shared/utils/id'
import { runPipeline } from '@/modules/transform/pipeline'
import { cloneDeep } from '@/shared/utils/clone'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()
const filters = ref<FilterCondition[]>([])
const transforms = ref<TransformStep[]>([])
const error = ref('')
const sortField = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const panelRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const cols = computed(() => store.selectedView?.table.columns || [])

watch(
  () => store.selectedView?.view,
  (v) => {
    if (!v) return
    filters.value = cloneDeep(v.viewFilters)
    transforms.value = cloneDeep(v.transforms)
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      void nextTick(() => {
        const first = focusables()[0]
        first?.focus()
      })
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

function addFilter() {
  filters.value.push({ id: uid('f'), field: cols.value[0]?.field || '', op: 'contains', value: '' })
}
function addTransform() {
  transforms.value.push({ id: uid('tr'), kind: 'select', config: { fields: cols.value.map((c) => c.field) } })
}
function resetConfig(t: TransformStep) {
  t.config = t.kind === 'select' || t.kind === 'dedupe' ? { fields: [] } : {}
}
function onKindChange(t: TransformStep, e: Event) {
  t.kind = (e.target as HTMLSelectElement).value as TransformStep['kind']
  resetConfig(t)
}
function syncSort(t: TransformStep) {
  t.config = { sorts: [{ field: sortField.value, order: sortOrder.value }] }
}
function onSortField(e: Event, t: TransformStep) {
  sortField.value = (e.target as HTMLSelectElement).value
  syncSort(t)
}
function onSortOrder(e: Event, t: TransformStep) {
  const v = (e.target as HTMLSelectElement).value
  sortOrder.value = v === 'desc' ? 'desc' : 'asc'
  syncSort(t)
}
function move(i: number, dir: number) {
  const j = i + dir
  const tmp = transforms.value[i]
  transforms.value[i] = transforms.value[j]
  transforms.value[j] = tmp
}

function save() {
  error.value = ''
  const sv = store.selectedView
  if (!sv) return
  try {
    runPipeline({
      columns: sv.table.columns,
      rows: sv.table.rows.slice(0, 5),
      tableFilters: sv.table.tableFilters,
      viewFilters: filters.value,
      transforms: transforms.value,
    })
  } catch (e) {
    error.value = String(e)
    toast('error', '转换无效，已阻断 Save')
    return
  }
  store.setViewFilters(sv.view.id, filters.value)
  store.setTransforms(sv.view.id, transforms.value)
  toast('success', '已保存')
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
.dialog-body h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  flex-shrink: 0;
  border-top: 1px solid #eef0f2;
}
.row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.err {
  color: #c45656;
  margin-top: 8px;
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
}
.native-field-select:focus-visible,
.native-input:focus-visible {
  outline: 2px solid #3370ff;
  outline-offset: 1px;
}
.native-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #f5f6f7;
}
.native-multi {
  height: auto;
  min-height: 72px;
  padding: 4px 6px;
}
.btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d0d3d6;
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
  font-size: 13px;
}
.btn:hover {
  border-color: #3370ff;
  color: #3370ff;
}
.btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}
.btn-primary {
  background: #3370ff;
  border-color: #3370ff;
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.05);
  color: #fff;
}
</style>
