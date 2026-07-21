<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Analysis, CombineInputRef, JoinKey, JoinType, ViewNode } from '../../shared/types'
import { createTable } from '../../shared/factories'
import { combineTables } from '../../shared/join'
import { useAnalysisStore } from '../../stores/analysisStore'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, IModal, ISelect, ITextField, toast, type SelectOption } from '../../ui'
import { buildCombinePreview, resolveCombineInput } from './combinePreview'

/** Combine 对话框：选左右输入（表/视图）→ Join/Append + 键列配对 → 实时预览 → 建表。 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

/* 输入选项：表 + 视图（视图先物化） */
interface InputOption {
  ref: CombineInputRef
  label: string
  group: string
}

function collectViews(analysis: Analysis): InputOption[] {
  const out: InputOption[] = []
  const walk = (tableId: string, tableName: string, views: ViewNode[], prefix: string) => {
    for (const v of views) {
      const label = `${tableName} / ${prefix}${v.name}`
      out.push({ ref: { kind: 'view', tableId, viewId: v.id }, label, group: '视图' })
      walk(tableId, tableName, v.children, `${prefix}${v.name} / `)
    }
  }
  for (const t of analysis.tables) walk(t.id, t.name, t.views, '')
  return out
}

const inputOptions = computed<InputOption[]>(() => {
  const a = current.value
  if (!a) return []
  return [
    ...a.tables.map((t) => ({ ref: { kind: 'table' as const, tableId: t.id }, label: t.name, group: '表' })),
    ...collectViews(a),
  ]
})

const selectOptions = computed<SelectOption[]>(() =>
  inputOptions.value.map((o, i) => ({ value: String(i), label: o.label, group: o.group, icon: o.ref.kind === 'table' ? ('database' as const) : ('table' as const) })),
)

const leftIdx = ref<string | number | null>(null)
const rightIdx = ref<string | number | null>(null)

function refOf(idx: string | number | null): CombineInputRef | null {
  if (idx === null || idx === undefined || idx === '') return null
  return inputOptions.value[Number(idx)]?.ref ?? null
}

const leftRef = computed(() => refOf(leftIdx.value))
const rightRef = computed(() => refOf(rightIdx.value))

const joinType = ref<JoinType>('left')
const keys = ref<JoinKey[]>([])
const tableName = ref('')

const leftInput = computed(() => (current.value && leftRef.value ? resolveCombineInput(current.value, leftRef.value) : null))
const rightInput = computed(() => (current.value && rightRef.value ? resolveCombineInput(current.value, rightRef.value) : null))

const leftColOptions = computed<SelectOption[]>(() => (leftInput.value?.columns ?? []).map((c) => ({ value: c.field, label: c.title })))
const rightColOptions = computed<SelectOption[]>(() => (rightInput.value?.columns ?? []).map((c) => ({ value: c.field, label: c.title })))

const JOIN_TYPES: { value: JoinType; label: string; desc: string }[] = [
  { value: 'left', label: 'Left join', desc: '保留左表全部行' },
  { value: 'inner', label: 'Inner join', desc: '仅保留匹配行' },
  { value: 'right', label: 'Right join', desc: '保留右表全部行' },
  { value: 'full', label: 'Full join', desc: '保留两侧全部行' },
  { value: 'append', label: 'Append', desc: '按列名纵向拼接' },
]

function guessKey() {
  const l = leftInput.value?.columns ?? []
  const r = rightInput.value?.columns ?? []
  const common = l.find((lc) => r.some((rc) => rc.field === lc.field))
  return { left: common?.field ?? l[0]?.field ?? '', right: common?.field ?? r[0]?.field ?? '' }
}

function addKey() {
  keys.value.push(guessKey())
}

function onInputsChanged() {
  if (keys.value.length === 0) addKey()
  const l = leftInput.value?.columns ?? []
  const r = rightInput.value?.columns ?? []
  tableName.value = tableName.value || `${labelOf(leftRef.value)} + ${labelOf(rightRef.value)}`
  // 修正失效键列
  for (const k of keys.value) {
    if (!l.some((c) => c.field === k.left)) k.left = l[0]?.field ?? ''
    if (!r.some((c) => c.field === k.right)) k.right = r[0]?.field ?? ''
  }
}

function labelOf(ref: CombineInputRef | null): string {
  if (!ref) return ''
  return inputOptions.value.find((o) => o.ref.tableId === ref.tableId && o.ref.viewId === ref.viewId)?.label ?? ''
}

const preview = computed(() => {
  const a = current.value
  if (!a) return null
  return buildCombinePreview(a, leftRef.value, rightRef.value, { joinType: joinType.value, keys: keys.value }, 50)
})

const canConfirm = computed(
  () =>
    !!leftRef.value &&
    !!rightRef.value &&
    !preview.value?.error &&
    (joinType.value === 'append' || keys.value.length > 0),
)

function close() {
  emit('update:open', false)
}

function confirm() {
  const a = current.value
  const p = preview.value
  if (!a || !p || p.error || !leftRef.value || !rightRef.value) return
  const left = resolveCombineInput(a, leftRef.value)
  const right = resolveCombineInput(a, rightRef.value)
  if (!left || !right) return
  const out = combineTables(left, right, { joinType: joinType.value, keys: keys.value })
  const name = tableName.value.trim() || `${labelOf(leftRef.value)} + ${labelOf(rightRef.value)}`
  const table = createTable(name, out.columns, out.rows, 'combine')
  table.combine = { joinType: joinType.value, left: leftRef.value, right: rightRef.value, keys: keys.value.map((k) => ({ ...k })) }
  store.mutate((ana) => {
    ana.tables.push(table)
  })
  store.select({ kind: 'table', tableId: table.id })
  toast.success(`已创建合并表「${name}」（${out.rows.length} 行）`)
  close()
}
</script>

<template>
  <IModal :open="open" title="Combine tables" :width="820" @update:open="emit('update:open', $event)">
    <div class="cb">
      <!-- 输入选择 -->
      <div class="cb__inputs">
        <div class="cb__input">
          <span class="cb__label">左输入</span>
          <ISelect v-model="leftIdx" :options="selectOptions" placeholder="选择表或视图" searchable @change="onInputsChanged" />
        </div>
        <IIcon name="combine" :size="18" class="cb__joinicon" />
        <div class="cb__input">
          <span class="cb__label">右输入</span>
          <ISelect v-model="rightIdx" :options="selectOptions" placeholder="选择表或视图" searchable @change="onInputsChanged" />
        </div>
      </div>

      <!-- Join 类型 -->
      <div class="cb__types" role="radiogroup" aria-label="合并类型">
        <button
          v-for="jt in JOIN_TYPES"
          :key="jt.value"
          type="button"
          class="cb__type"
          :class="{ 'cb__type--active': joinType === jt.value }"
          role="radio"
          :aria-checked="joinType === jt.value"
          @click="joinType = jt.value"
        >
          <IIcon name="combine" :size="15" />
          <span class="cb__type-label">{{ jt.label }}</span>
          <span class="cb__type-desc">{{ jt.desc }}</span>
        </button>
      </div>

      <!-- 键列配对 -->
      <div v-if="joinType !== 'append'" class="cb__keys">
        <div class="cb__keys-head">
          <span class="cb__label">连接键（左 = 右）</span>
          <button type="button" class="cb__addkey" @click="addKey"><IIcon name="plus" :size="12" /> 添加键</button>
        </div>
        <div v-for="(k, i) in keys" :key="i" class="cb__keyrow">
          <ISelect v-model="k.left" :options="leftColOptions" size="sm" placeholder="左列" class="cb__grow" />
          <span class="cb__eq">=</span>
          <ISelect v-model="k.right" :options="rightColOptions" size="sm" placeholder="右列" class="cb__grow" />
          <IButton variant="ghost" icon="trash" size="sm" title="删除键" :disabled="keys.length <= 1" @click="keys.splice(i, 1)" />
        </div>
      </div>

      <!-- 预览 -->
      <div v-if="preview && (leftRef || rightRef)" class="cb__preview">
        <div class="cb__preview-stats">
          <template v-if="!preview.error">
            左 {{ preview.leftRows }} 行 · 右 {{ preview.rightRows }} 行 → 结果 {{ preview.totalRows }} 行（预览前 50）
          </template>
          <template v-else>{{ preview.error }}</template>
        </div>
        <div v-if="preview.noMatch" class="cb__warn">当前连接键下没有匹配行（可以创建空表，或调整键/类型）</div>
        <div v-if="!preview.error && preview.columns.length" class="cb__tablewrap">
          <table class="cb__table">
            <thead>
              <tr>
                <th v-for="c in preview.columns" :key="c.field">
                  <span class="cb__th">
                    <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="12" />
                    <span class="is-ellipsis">{{ c.title }}</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, r) in preview.rows" :key="r">
                <td v-for="c in preview.columns" :key="c.field">
                  <span class="is-ellipsis">{{ row[c.field] ?? '' }}</span>
                </td>
              </tr>
              <tr v-if="preview.rows.length === 0">
                <td :colspan="preview.columns.length" class="cb__emptycell">结果为空</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ITextField v-model="tableName" placeholder="新表名称" aria-label="新表名称" />
    </div>

    <template #footer>
      <IButton @click="close">取消</IButton>
      <IButton variant="primary" :disabled="!canConfirm" @click="confirm">Create table</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.cb {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cb__inputs {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.cb__input {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cb__joinicon {
  color: var(--is-text-tertiary);
  margin-bottom: 8px;
}
.cb__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cb__types {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.cb__type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  color: var(--is-text-secondary);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.cb__type:hover {
  border-color: var(--is-border-strong);
  background: var(--is-surface-hover);
}
.cb__type--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.cb__type-label {
  font-size: var(--is-text-xs);
  font-weight: 600;
}
.cb__type-desc {
  font-size: 11px;
  color: var(--is-text-tertiary);
  text-align: center;
}
.cb__keys {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cb__keys-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cb__addkey {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--is-accent);
  font-size: var(--is-text-xs);
  font-weight: 500;
}
.cb__keyrow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cb__grow {
  flex: 1;
  min-width: 0;
}
.cb__eq {
  color: var(--is-text-tertiary);
}
.cb__preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cb__preview-stats {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.cb__warn {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  font-size: var(--is-text-xs);
  border-radius: var(--is-radius-sm);
  padding: 6px 10px;
}
.cb__tablewrap {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: auto;
  max-height: 220px;
}
.cb__table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--is-text-xs);
}
.cb__table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
  padding: 6px 8px;
  text-align: left;
}
.cb__th {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
}
.cb__table td {
  border-bottom: 1px solid var(--is-border);
  padding: 5px 8px;
  color: var(--is-text-secondary);
  max-width: 160px;
}
.cb__table td span {
  display: block;
  max-width: 160px;
}
.cb__emptycell {
  text-align: center;
  color: var(--is-text-tertiary);
  padding: 16px !important;
}
</style>
