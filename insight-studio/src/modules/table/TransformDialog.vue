<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ColumnMeta, Row, SortKey, Transform, TransformType } from '../../shared/types'
import { createTransform } from '../../shared/factories'
import { uuid } from '../../shared/id'
import { IButton, IIcon, IModal, ISelect, ITextField, IToggle, type SelectOption } from '../../ui'
import { TRANSFORM_TYPE_LABELS, derivedPreview, validateTransformDraft } from './transformForm'

/** 转换编辑抽屉（截图 13 心智）：类型选择 → 对应表单 → 校验 → Apply。 */
const props = withDefaults(
  defineProps<{
    open: boolean
    columns: ColumnMeta[]
    /** 派生列预览用的当前视图行（前 N 行即可）。 */
    rows?: Row[]
    initial?: Transform | null
    /** 新建时预选类型（如列菜单「插入派生列」）。 */
    prefillType?: TransformType
  }>(),
  { initial: null, prefillType: undefined, rows: () => [] },
)

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'apply', t: Transform): void
}>()

const type = ref<TransformType>('select')
const errors = ref<string[]>([])

/* select */
const selectMode = ref<'keep' | 'drop'>('keep')
const selectCols = ref<string[]>([])
const colSearch = ref('')

/* rename */
const renames = ref<{ id: string; from: string; to: string }[]>([])

/* derived */
const derivedName = ref('')
const derivedExpr = ref('')
const exprError = computed(() => {
  if (!derivedExpr.value.trim()) return ''
  return validateTransformDraft(
    createTransform('derived', { name: derivedName.value || '__tmp__', expression: derivedExpr.value }),
    props.columns,
  ).errors.find((e) => !e.includes('列名')) ?? ''
})
const preview = computed(() => derivedPreview(derivedExpr.value, props.rows, 5))

/* dedupe */
const dedupeCols = ref<string[]>([])

/* sort */
const sortKeys = ref<(SortKey & { id: string })[]>([])

const typeOptions: SelectOption[] = (Object.keys(TRANSFORM_TYPE_LABELS) as TransformType[]).map((t) => ({
  value: t,
  label: TRANSFORM_TYPE_LABELS[t],
}))

const columnOptions = computed<SelectOption[]>(() =>
  props.columns.map((c) => ({ value: c.field, label: c.title, icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const) })),
)

const filteredColumns = computed(() => {
  const q = colSearch.value.trim().toLowerCase()
  if (!q) return props.columns
  return props.columns.filter((c) => c.title.toLowerCase().includes(q) || c.field.toLowerCase().includes(q))
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errors.value = []
    colSearch.value = ''
    const init = props.initial
    type.value = init?.type ?? props.prefillType ?? 'select'
    // 默认全选/空态
    selectMode.value = init?.type === 'select' ? init.mode : 'keep'
    selectCols.value = init?.type === 'select' ? [...init.columns] : props.columns.map((c) => c.field)
    renames.value =
      init?.type === 'rename'
        ? init.renames.map((r) => ({ id: uuid(), from: r.from, to: r.to }))
        : [{ id: uuid(), from: props.columns[0]?.field ?? '', to: '' }]
    derivedName.value = init?.type === 'derived' ? init.name : ''
    derivedExpr.value = init?.type === 'derived' ? init.expression : ''
    dedupeCols.value = init?.type === 'dedupe' ? [...init.columns] : []
    sortKeys.value =
      init?.type === 'sort'
        ? init.keys.map((k) => ({ id: uuid(), ...k }))
        : [{ id: uuid(), column: props.columns[0]?.field ?? '', direction: 'asc' as const }]
  },
  { immediate: true },
)

function toggleInList(list: string[], field: string) {
  const i = list.indexOf(field)
  if (i >= 0) list.splice(i, 1)
  else list.push(field)
}

/* 任何表单编辑都清除上一次的 Apply 校验错误，避免陈旧报错残留 */
watch(
  [type, selectMode, selectCols, renames, derivedName, derivedExpr, dedupeCols, sortKeys],
  () => {
    errors.value = []
  },
  { deep: true },
)

function addRename() {
  const used = new Set(renames.value.map((r) => r.from))
  const next = props.columns.find((c) => !used.has(c.field))?.field ?? props.columns[0]?.field ?? ''
  renames.value.push({ id: uuid(), from: next, to: '' })
}

function addSortKey() {
  const used = new Set(sortKeys.value.map((k) => k.column))
  const next = props.columns.find((c) => !used.has(c.field))?.field ?? props.columns[0]?.field ?? ''
  sortKeys.value.push({ id: uuid(), column: next, direction: 'asc' })
}

function moveSortKey(i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= sortKeys.value.length) return
  const [k] = sortKeys.value.splice(i, 1)
  sortKeys.value.splice(j, 0, k)
}

/* 排序键拖拽调优先级 */
const dragIdx = ref(-1)
function onDragStart(i: number) {
  dragIdx.value = i
}
function onDrop(i: number) {
  if (dragIdx.value < 0 || dragIdx.value === i) return
  const [k] = sortKeys.value.splice(dragIdx.value, 1)
  sortKeys.value.splice(i, 0, k)
  dragIdx.value = -1
}

function buildTransform(): Transform | null {
  const id = props.initial?.id
  let t: Transform
  switch (type.value) {
    case 'select':
      t = createTransform('select', { mode: selectMode.value, columns: [...selectCols.value] })
      break
    case 'rename':
      t = createTransform('rename', {
        renames: renames.value.filter((r) => r.from && r.to.trim()).map((r) => ({ from: r.from, to: r.to.trim() })),
      })
      break
    case 'derived':
      t = createTransform('derived', { name: derivedName.value.trim(), expression: derivedExpr.value.trim() })
      break
    case 'dedupe':
      t = createTransform('dedupe', { columns: [...dedupeCols.value] })
      break
    case 'sort':
      t = createTransform('sort', { keys: sortKeys.value.map((k) => ({ column: k.column, direction: k.direction })) })
      break
  }
  if (id) t.id = id
  return t
}

function apply() {
  const t = buildTransform()
  if (!t) return
  const result = validateTransformDraft(t, props.columns)
  if (!result.ok) {
    errors.value = result.errors
    return
  }
  emit('apply', t)
  emit('update:open', false)
}

function fmtPreview(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  return typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v)
}
</script>

<template>
  <IModal :open="open" variant="drawer" :width="520" :title="initial ? '编辑转换' : '新建转换'" @update:open="emit('update:open', $event)">
    <div class="td">
      <div class="td__type">
        <ISelect v-model="type" :options="typeOptions" :disabled="!!initial" aria-label="转换类型" />
      </div>

      <!-- Select columns -->
      <template v-if="type === 'select'">
        <div class="td__mode">
          <IToggle :model-value="selectMode === 'keep'" @update:model-value="selectMode = $event ? 'keep' : 'drop'">
            {{ selectMode === 'keep' ? 'Keep（保留所选）' : 'Drop（剔除所选）' }}
          </IToggle>
        </div>
        <ITextField v-model="colSearch" placeholder="搜索列…" prefix-icon="search" clearable size="sm" />
        <div class="td__collist">
          <label v-for="c in filteredColumns" :key="c.field" class="td__colitem">
            <input type="checkbox" :checked="selectCols.includes(c.field)" @change="toggleInList(selectCols, c.field)" />
            <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="13" class="td__typeicon" />
            <span class="is-ellipsis">{{ c.title }}</span>
          </label>
          <div v-if="!filteredColumns.length" class="td__none">无匹配列</div>
        </div>
      </template>

      <!-- Rename -->
      <template v-else-if="type === 'rename'">
        <div v-for="r in renames" :key="r.id" class="td__renamerow">
          <ISelect v-model="r.from" :options="columnOptions" size="sm" class="td__grow" />
          <IIcon name="arrow-right" :size="13" class="td__arrow" />
          <ITextField v-model="r.to" size="sm" placeholder="新列名" class="td__grow" />
          <IButton variant="ghost" icon="trash" size="sm" title="删除" :disabled="renames.length <= 1" @click="renames = renames.filter((x) => x.id !== r.id)" />
        </div>
        <button type="button" class="td__add" @click="addRename"><IIcon name="plus" :size="13" /> 添加重命名</button>
      </template>

      <!-- Derived -->
      <template v-else-if="type === 'derived'">
        <label class="td__label">新列名</label>
        <ITextField v-model="derivedName" placeholder="例如 ratio" />
        <label class="td__label">表达式</label>
        <ITextField
          v-model="derivedExpr"
          placeholder="例如 sepal_length * 2 或 concat(group, '-', well)"
          :error="!!exprError"
        />
        <p v-if="exprError" class="td__error">{{ exprError }}</p>
        <p class="td__hint">
          支持 + - * / 、括号、数字、'字符串'、concat(a, b, …)；列名用裸标识符或 [带空格的列名]。
        </p>
        <div v-if="preview && preview.length" class="td__preview">
          <div class="td__preview-title">预览（前 {{ preview.length }} 行）</div>
          <div class="td__preview-values">
            <span v-for="(v, i) in preview" :key="i" class="td__preview-value">{{ fmtPreview(v) }}</span>
          </div>
        </div>
      </template>

      <!-- Dedupe -->
      <template v-else-if="type === 'dedupe'">
        <p class="td__hint">按所选列组合去重，保留首行；不选列 = 整行去重。</p>
        <div class="td__collist">
          <label v-for="c in columns" :key="c.field" class="td__colitem">
            <input type="checkbox" :checked="dedupeCols.includes(c.field)" @change="toggleInList(dedupeCols, c.field)" />
            <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="13" class="td__typeicon" />
            <span class="is-ellipsis">{{ c.title }}</span>
          </label>
        </div>
      </template>

      <!-- Sort -->
      <template v-else-if="type === 'sort'">
        <p class="td__hint">优先级从上到下；可拖拽手柄调整。</p>
        <div
          v-for="(k, i) in sortKeys"
          :key="k.id"
          class="td__sortrow"
          :class="{ 'td__sortrow--drag': dragIdx === i }"
          @dragover.prevent
          @drop="onDrop(i)"
        >
          <span class="td__drag" draggable="true" title="拖拽调整优先级" @dragstart="onDragStart(i)">
            <IIcon name="drag" :size="13" />
          </span>
          <ISelect v-model="k.column" :options="columnOptions" size="sm" class="td__grow" />
          <ISelect
            v-model="k.direction"
            size="sm"
            :options="[
              { value: 'asc', label: '升序' },
              { value: 'desc', label: '降序' },
            ]"
          />
          <IButton variant="ghost" icon="chevron-up" size="sm" title="上移" :disabled="i === 0" @click="moveSortKey(i, -1)" />
          <IButton variant="ghost" icon="chevron-down" size="sm" title="下移" :disabled="i === sortKeys.length - 1" @click="moveSortKey(i, 1)" />
          <IButton variant="ghost" icon="trash" size="sm" title="删除" :disabled="sortKeys.length <= 1" @click="sortKeys = sortKeys.filter((x) => x.id !== k.id)" />
        </div>
        <button type="button" class="td__add" @click="addSortKey"><IIcon name="plus" :size="13" /> 添加排序列</button>
      </template>

      <div v-if="errors.length" class="td__errors">
        <p v-for="(e, i) in errors" :key="i" class="td__error">{{ e }}</p>
      </div>
    </div>

    <template #footer>
      <IButton @click="emit('update:open', false)">Cancel</IButton>
      <IButton variant="primary" @click="apply">Apply</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.td {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.td__type {
  max-width: 260px;
}
.td__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
  margin-bottom: -6px;
}
.td__mode {
  display: flex;
}
.td__collist {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.td__colitem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  cursor: pointer;
}
.td__colitem:hover {
  background: var(--is-surface-hover);
}
.td__typeicon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.td__none {
  padding: 16px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}
.td__renamerow,
.td__sortrow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.td__sortrow--drag {
  opacity: 0.5;
}
.td__grow {
  flex: 1;
  min-width: 0;
}
.td__arrow {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.td__drag {
  cursor: grab;
  color: var(--is-text-tertiary);
  display: inline-flex;
  padding: 4px;
}
.td__add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  color: var(--is-accent);
  font-size: var(--is-text-sm);
  font-weight: 500;
  padding: 4px 2px;
}
.td__add:hover {
  color: var(--is-accent-hover);
}
.td__hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
.td__error {
  color: var(--is-danger);
  font-size: var(--is-text-xs);
}
.td__errors {
  background: var(--is-danger-soft);
  border-radius: var(--is-radius-sm);
  padding: 8px 12px;
}
.td__preview {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  padding: 8px 12px;
}
.td__preview-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.td__preview-values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.td__preview-value {
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  padding: 2px 8px;
  font-size: var(--is-text-xs);
  font-family: var(--is-font-mono);
}
</style>
