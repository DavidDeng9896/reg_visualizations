<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ColumnMeta, Filter, FilterOperator } from '../../shared/types'
import { createCondition, createFilter } from '../../shared/factories'
import { uuid } from '../../shared/id'
import { IButton, IIcon, IModal, ISelect, ITextField, type SelectOption } from '../../ui'
import { conditionValid, operatorArity, operatorsFor, parseConditionValue } from './filterForm'

/**
 * 过滤编辑弹窗（截图 14 心智）：单 filter 多条件 And/Or。
 * scope 文案标明作用层级（表级 / 视图级）。
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    columns: ColumnMeta[]
    /** 编辑已有 filter 时传入；新建传 null。 */
    initial?: Filter | null
    /** 层级标签，如「表级过滤，作用于所有视图」。 */
    scope: string
  }>(),
  { initial: null },
)

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'apply', filter: Filter): void
}>()

interface CondDraft {
  id: string
  column: string
  operator: FilterOperator
  valueText: string
  value2Text: string
}

const combinator = ref<'and' | 'or'>('and')
const conds = ref<CondDraft[]>([])
const error = ref('')

function typeOf(field: string) {
  return props.columns.find((c) => c.field === field)?.dataType ?? 'string'
}

function operatorOptions(field: string): SelectOption[] {
  return operatorsFor(typeOf(field)).map((o) => ({ value: o.value, label: o.label }))
}

const columnOptions = computed<SelectOption[]>(() =>
  props.columns.map((c) => ({ value: c.field, label: c.title, icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const) })),
)

function makeDraft(column?: string, operator?: FilterOperator): CondDraft {
  const col = column ?? props.columns[0]?.field ?? ''
  const op = operator ?? operatorsFor(typeOf(col))[0]?.value ?? 'eq'
  return { id: uuid(), column: col, operator: op, valueText: '', value2Text: '' }
}

function toText(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x)).join(', ')
  return v === null || v === undefined ? '' : String(v)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = ''
    if (props.initial) {
      combinator.value = props.initial.combinator
      conds.value = props.initial.conditions.map((c) => ({
        id: c.id,
        column: c.column,
        operator: c.operator,
        valueText: toText(c.value),
        value2Text: toText(c.value2),
      }))
      if (conds.value.length === 0) conds.value = [makeDraft()]
    } else {
      combinator.value = 'and'
      conds.value = [makeDraft()]
    }
  },
  { immediate: true },
)

function onColumnChange(d: CondDraft) {
  // 列变化后，若当前操作符不适用于新类型则重置为该类型首个操作符
  const ops = operatorsFor(typeOf(d.column)).map((o) => o.value)
  if (!ops.includes(d.operator)) d.operator = ops[0]
}

function addCondition() {
  conds.value.push(makeDraft())
}

/* 编辑任意条件即清除上一次 Apply 的校验错误，避免陈旧报错残留 */
watch([combinator, conds], () => {
  error.value = ''
}, { deep: true })

function removeCondition(id: string) {
  conds.value = conds.value.filter((c) => c.id !== id)
}

function arityOf(d: CondDraft) {
  return operatorArity(d.operator)
}

function apply() {
  const built: Filter = props.initial
    ? { ...props.initial, combinator: combinator.value, conditions: [] }
    : createFilter(conds.value[0]?.column ?? '')
  built.combinator = combinator.value
  built.conditions = []
  for (const d of conds.value) {
    const dt = typeOf(d.column)
    const cond = createCondition(d.column, d.operator)
    cond.id = d.id
    const arity = operatorArity(d.operator)
    if (arity === 'one') cond.value = parseConditionValue(d.operator, d.valueText, dt)
    if (arity === 'two') {
      cond.value = parseConditionValue('eq', d.valueText, dt)
      cond.value2 = parseConditionValue('eq', d.value2Text, dt) as Filter['conditions'][number]['value2']
    }
    if (arity === 'list') cond.value = parseConditionValue('in', d.valueText, dt)
    const err = conditionValid(cond)
    if (err) {
      error.value = err
      return
    }
    built.conditions.push(cond)
  }
  if (built.conditions.length === 0) {
    error.value = '请至少保留一个条件'
    return
  }
  emit('apply', built)
  emit('update:open', false)
}
</script>

<template>
  <IModal :open="open" :title="initial ? '编辑过滤' : '新建过滤'" :width="620" @update:open="emit('update:open', $event)">
    <div class="fd">
      <div class="fd__scope">
        <IIcon name="filter" :size="13" />
        <span>{{ scope }}</span>
      </div>

      <div class="fd__rows">
        <template v-for="(d, i) in conds" :key="d.id">
          <div v-if="i > 0" class="fd__combinator">
            <ISelect
              :model-value="combinator"
              size="sm"
              :options="[
                { value: 'and', label: 'And（且）' },
                { value: 'or', label: 'Or（或）' },
              ]"
              @update:model-value="combinator = $event as 'and' | 'or'"
            />
          </div>
          <div class="fd__row">
            <ISelect v-model="d.column" :options="columnOptions" searchable size="sm" class="fd__col" @change="onColumnChange(d)" />
            <ISelect v-model="d.operator" :options="operatorOptions(d.column)" size="sm" class="fd__op" />
            <template v-if="arityOf(d) === 'one'">
              <ITextField v-model="d.valueText" size="sm" placeholder="值" class="fd__val" @enter="apply" />
            </template>
            <template v-else-if="arityOf(d) === 'two'">
              <ITextField v-model="d.valueText" size="sm" placeholder="下界" class="fd__val" @enter="apply" />
              <span class="fd__tilde">~</span>
              <ITextField v-model="d.value2Text" size="sm" placeholder="上界" class="fd__val" @enter="apply" />
            </template>
            <template v-else-if="arityOf(d) === 'list'">
              <ITextField v-model="d.valueText" size="sm" placeholder="值1, 值2, …（逗号分隔）" class="fd__val" @enter="apply" />
            </template>
            <span v-else class="fd__val fd__noval">无需值</span>
            <IButton variant="ghost" icon="trash" size="sm" title="删除条件" :disabled="conds.length <= 1" @click="removeCondition(d.id)" />
          </div>
        </template>
      </div>

      <button type="button" class="fd__add" @click="addCondition">
        <IIcon name="plus" :size="13" /> Add condition
      </button>

      <p v-if="error" class="fd__error">{{ error }}</p>
    </div>

    <template #footer>
      <IButton @click="emit('update:open', false)">Cancel</IButton>
      <IButton variant="primary" @click="apply">Apply</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.fd {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fd__scope {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  padding: 5px 10px;
  align-self: flex-start;
}
.fd__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fd__combinator {
  display: flex;
}
.fd__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fd__col {
  flex: 1.2;
  min-width: 0;
}
.fd__op {
  flex: 1;
  min-width: 0;
}
.fd__val {
  flex: 1.2;
  min-width: 0;
}
.fd__noval {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.fd__tilde {
  color: var(--is-text-tertiary);
}
.fd__add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  color: var(--is-accent);
  font-size: var(--is-text-sm);
  font-weight: 500;
  padding: 4px 2px;
  border-radius: var(--is-radius-sm);
}
.fd__add:hover {
  color: var(--is-accent-hover);
}
.fd__error {
  color: var(--is-danger);
  font-size: var(--is-text-xs);
}
</style>
