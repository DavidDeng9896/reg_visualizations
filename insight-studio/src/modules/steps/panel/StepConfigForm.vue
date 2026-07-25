<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { DataType, Filter, FilterCondition, StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { IButton, IIcon, ISelect, ITextField, IToggle, type SelectOption } from '../../../ui'
import { getStepDef } from '../registry'
import { resolveStepInputs } from '../exec'
import { operatorArity, operatorsFor, parseConditionValue } from '../../table/filterForm'

const props = defineProps<{ step: StepNode }>()
const emit = defineEmits<{ (e: 'change'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const def = computed(() => getStepDef(props.step.type))
const inputTable = computed(() => {
  if (!current.value) return null
  const inputs = resolveStepInputs(current.value, props.step)
  const first = Object.values(inputs)[0]
  return Array.isArray(first) ? first[0] ?? null : first ?? null
})

const columnOptions = computed<SelectOption[]>(() =>
  inputTable.value?.columns.map((c) => ({
    value: c.field,
    label: c.title,
    icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const),
  })) ?? [],
)

function dataTypeOf(field: string): DataType {
  return inputTable.value?.columns.find((c) => c.field === field)?.dataType ?? 'string'
}

function ensureConfig(defaults: Record<string, unknown>): Record<string, unknown> {
  const cfg = props.step.config
  for (const [k, v] of Object.entries(defaults)) {
    if (cfg[k] === undefined) cfg[k] = v
  }
  return cfg
}

/* ------------------------------ filter ------------------------------ */

function addFilter() {
  const cfg = ensureConfig({ filters: [] as Filter[] }) as { filters: Filter[] }
  const col = inputTable.value?.columns[0]?.field ?? ''
  cfg.filters.push({ id: crypto.randomUUID(), combinator: 'and', conditions: [{ id: crypto.randomUUID(), column: col, operator: 'eq' }] })
  emit('change')
}

function removeFilter(idx: number) {
  const cfg = ensureConfig({ filters: [] as Filter[] }) as { filters: Filter[] }
  cfg.filters.splice(idx, 1)
  emit('change')
}

function addCondition(filter: Filter) {
  const col = inputTable.value?.columns[0]?.field ?? ''
  filter.conditions.push({ id: crypto.randomUUID(), column: col, operator: 'eq' })
  emit('change')
}

function removeCondition(filter: Filter, cidx: number) {
  filter.conditions.splice(cidx, 1)
  emit('change')
}

function operatorOptions(cond: FilterCondition): SelectOption[] {
  return operatorsFor(dataTypeOf(cond.column)).map((o) => ({ value: o.value, label: o.label }))
}

function onCondColumnChange(cond: FilterCondition, field: string | number) {
  cond.column = String(field)
  const ops = operatorsFor(dataTypeOf(cond.column)).map((o) => o.value)
  if (!ops.includes(cond.operator)) cond.operator = ops[0] ?? 'eq'
  cond.value = undefined
  cond.value2 = undefined
  emit('change')
}

function onCondOperatorChange(cond: FilterCondition, op: string | number) {
  cond.operator = op as FilterCondition['operator']
  cond.value = undefined
  cond.value2 = undefined
  emit('change')
}

function condValueText(cond: FilterCondition): string {
  if (Array.isArray(cond.value)) return cond.value.map(String).join(', ')
  return cond.value === null || cond.value === undefined ? '' : String(cond.value)
}

function onCondValueInput(cond: FilterCondition, text: string) {
  cond.value = parseConditionValue(cond.operator, text, dataTypeOf(cond.column))
  emit('change')
}

function onCondValue2Input(cond: FilterCondition, text: string) {
  cond.value2 = parseConditionValue('eq', text, dataTypeOf(cond.column)) as FilterCondition['value2']
  emit('change')
}

/* ------------------------------ hide-columns ------------------------------ */

function toggleColumn(field: string) {
  const cfg = ensureConfig({ mode: 'drop' as 'keep' | 'drop', columns: [] as string[] }) as { mode: 'keep' | 'drop'; columns: string[] }
  const i = cfg.columns.indexOf(field)
  if (i >= 0) cfg.columns.splice(i, 1)
  else cfg.columns.push(field)
  emit('change')
}

/* ------------------------------ computed-column ------------------------------ */

const computedCfg = computed<{ name: string; expression: string }>(() => {
  ensureConfig({ name: '', expression: '' })
  return props.step.config as { name: string; expression: string }
})

/* ------------------------------ join ------------------------------ */

const joinCfg = computed<{ joinType: 'left' | 'inner' | 'right' | 'full'; keys: { left: string; right: string }[]; suffixes: [string, string] }>(() => {
  ensureConfig({ joinType: 'left' as const, keys: [] as { left: string; right: string }[], suffixes: ['_x', '_y'] })
  return props.step.config as { joinType: 'left' | 'inner' | 'right' | 'full'; keys: { left: string; right: string }[]; suffixes: [string, string] }
})
const rightTable = computed(() => {
  if (!current.value || props.step.type !== 'join') return null
  const inputs = resolveStepInputs(current.value, props.step)
  return (inputs['Right table'] as typeof inputTable.value) ?? null
})

const rightColumnOptions = computed<SelectOption[]>(() =>
  rightTable.value?.columns.map((c) => ({
    value: c.field,
    label: c.title,
    icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const),
  })) ?? [],
)

function guessJoinKey(): { left: string; right: string } {
  const l = inputTable.value?.columns ?? []
  const r = rightTable.value?.columns ?? []
  const common = l.find((lc) => r.some((rc) => rc.field === lc.field))
  return { left: common?.field ?? l[0]?.field ?? '', right: common?.field ?? r[0]?.field ?? '' }
}

function addJoinKey() {
  joinCfg.value.keys.push(guessJoinKey())
  emit('change')
}

function removeJoinKey(idx: number) {
  joinCfg.value.keys.splice(idx, 1)
  emit('change')
}

/* ------------------------------ union ------------------------------ */

const unionCfg = computed<{ alignBy: 'name' | 'position'; fillNull: boolean; addSourceColumn: boolean }>(() => {
  ensureConfig({ alignBy: 'name' as 'name' | 'position', fillNull: true, addSourceColumn: false })
  return props.step.config as { alignBy: 'name' | 'position'; fillNull: boolean; addSourceColumn: boolean }
})

watch(() => props.step.type, () => {
  // 切换类型时重置默认配置
  const defaults = def.value.defaultConfig
  for (const [k, v] of Object.entries(defaults)) {
    if (props.step.config[k] === undefined) props.step.config[k] = JSON.parse(JSON.stringify(v))
  }
}, { immediate: true })
</script>

<template>
  <div class="scf">
    <p v-if="!inputTable && def.inputs.length > 0" class="scf__warn">无法解析输入表，请先连接输入端口。</p>

    <!-- Filter -->
    <template v-if="step.type === 'filter'">
      <section class="scf__section">
        <h4 class="scf__section-title">Filter logic</h4>
        <div v-for="(filter, fidx) in step.config.filters as Filter[]" :key="filter.id" class="scf__filter">
          <div class="scf__filter-head">
            <ISelect
              :model-value="filter.combinator"
              size="sm"
              class="scf__combinator"
              :options="[{ value: 'and', label: 'And' }, { value: 'or', label: 'Or' }]"
              @update:model-value="filter.combinator = $event as 'and' | 'or'; emit('change')"
            />
            <IButton variant="ghost" icon="trash" size="sm" @click="removeFilter(fidx)">Remove</IButton>
          </div>
          <div v-for="(cond, cidx) in filter.conditions" :key="cond.id" class="scf__cond">
            <div class="scf__cond-head">
              <span class="scf__cond-title">Condition {{ cidx + 1 }}</span>
              <button
                type="button"
                class="scf__cond-remove"
                :disabled="filter.conditions.length <= 1"
                aria-label="删除条件"
                @click="removeCondition(filter, cidx)"
              >
                <IIcon name="trash" :size="14" />
              </button>
            </div>
            <div class="scf__cond-row">
              <ISelect :model-value="cond.column" size="sm" class="scf__cond-col" aria-label="Filter column" :options="columnOptions" @update:model-value="onCondColumnChange(cond, $event)" />
              <ISelect :model-value="cond.operator" size="sm" class="scf__cond-op" aria-label="Filter operator" :options="operatorOptions(cond)" @update:model-value="onCondOperatorChange(cond, $event)" />
            </div>
            <template v-if="operatorArity(cond.operator) === 'one'">
              <ITextField
                :model-value="condValueText(cond)"
                size="sm"
                placeholder="value"
                aria-label="Filter value"
                @update:model-value="onCondValueInput(cond, $event)"
              />
            </template>
            <template v-else-if="operatorArity(cond.operator) === 'two'">
              <div class="scf__cond-row">
                <ITextField
                  :model-value="condValueText(cond)"
                  size="sm"
                  class="scf__cond-val"
                  placeholder="min"
                  aria-label="Filter min value"
                  @update:model-value="onCondValueInput(cond, $event)"
                />
                <ITextField
                  :model-value="cond.value2 === null || cond.value2 === undefined ? '' : String(cond.value2)"
                  size="sm"
                  class="scf__cond-val"
                  placeholder="max"
                  aria-label="Filter max value"
                  @update:model-value="onCondValue2Input(cond, $event)"
                />
              </div>
            </template>
            <template v-else-if="operatorArity(cond.operator) === 'list'">
              <ITextField
                :model-value="condValueText(cond)"
                size="sm"
                placeholder="a, b, c"
                aria-label="Filter values"
                @update:model-value="onCondValueInput(cond, $event)"
              />
            </template>
          </div>
          <button type="button" class="scf__add" @click="addCondition(filter)">
            <IIcon name="plus" :size="14" />
            <span>Add condition</span>
          </button>
        </div>
        <IButton variant="ghost" icon="plus" @click="addFilter">Add filter group</IButton>
      </section>
    </template>

    <!-- Hide columns -->
    <template v-else-if="step.type === 'hide-columns'">
      <section class="scf__section">
        <h4 class="scf__section-title">Columns</h4>
        <div class="scf__field">
          <label class="scf__label">Mode</label>
          <ISelect
            :model-value="step.config.mode as 'keep' | 'drop'"
            size="sm"
            :options="[{ value: 'keep', label: 'Keep selected' }, { value: 'drop', label: 'Drop selected' }]"
            @update:model-value="step.config.mode = $event; emit('change')"
          />
        </div>
        <div class="scf__collist">
          <label v-for="c in inputTable?.columns ?? []" :key="c.field" class="scf__colitem">
            <input
              type="checkbox"
              :checked="(step.config.columns as string[]).includes(c.field)"
              @change="toggleColumn(c.field)"
            />
            <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="13" />
            <span>{{ c.title }}</span>
          </label>
        </div>
      </section>
    </template>

    <!-- Computed column -->
    <template v-else-if="step.type === 'computed-column'">
      <section class="scf__section">
        <h4 class="scf__section-title">Computed column</h4>
        <div class="scf__field">
          <label class="scf__label">New column name</label>
          <ITextField v-model="computedCfg.name" size="sm" @input="emit('change')" />
        </div>
        <div class="scf__field">
          <label class="scf__label">Expression</label>
          <ITextField v-model="computedCfg.expression" size="sm" placeholder="e.g. round(value * 2, 1)" @input="emit('change')" />
        </div>
        <p class="scf__hint">
          Supports + - * / parentheses numbers 'strings' and functions:
          if(cond,a,b) round(x,n) abs sqrt log ln min max year month day concat(...).
          Use [column name] for names with spaces.
        </p>
      </section>
    </template>

    <!-- Join -->
    <template v-else-if="step.type === 'join'">
      <section class="scf__section">
        <h4 class="scf__section-title">Join settings</h4>
        <div class="scf__field">
          <label class="scf__label">Join type</label>
          <div class="scf__join-types">
            <button
              v-for="jt in ['left', 'inner', 'right', 'full']"
              :key="jt"
              type="button"
              class="scf__join-type"
              :class="{ 'scf__join-type--active': joinCfg.joinType === jt }"
              @click="joinCfg.joinType = jt as 'left' | 'inner' | 'right' | 'full'; emit('change')"
            >
              {{ jt[0].toUpperCase() + jt.slice(1) }}
            </button>
          </div>
        </div>

        <div class="scf__field">
          <label class="scf__label">Join keys</label>
          <div v-for="(k, i) in joinCfg.keys" :key="i" class="scf__keyrow">
            <ISelect :model-value="k.left" size="sm" class="scf__keycol" :options="columnOptions" placeholder="Left column" @update:model-value="k.left = String($event); emit('change')" />
            <span class="scf__keyeq">=</span>
            <ISelect :model-value="k.right" size="sm" class="scf__keycol" :options="rightColumnOptions" placeholder="Right column" @update:model-value="k.right = String($event); emit('change')" />
            <IButton variant="ghost" icon="trash" size="sm" :disabled="joinCfg.keys.length <= 1" @click="removeJoinKey(i)" />
          </div>
          <button type="button" class="scf__add" @click="addJoinKey">
            <IIcon name="plus" :size="14" />
            <span>Add key</span>
          </button>
        </div>

        <div class="scf__field">
          <label class="scf__label">Suffixes</label>
          <div class="scf__suffixes">
            <ITextField v-model="joinCfg.suffixes[0]" size="sm" class="scf__suffix" placeholder="left suffix" @input="emit('change')" />
            <ITextField v-model="joinCfg.suffixes[1]" size="sm" class="scf__suffix" placeholder="right suffix" @input="emit('change')" />
          </div>
        </div>
      </section>
    </template>

    <!-- Union -->
    <template v-else-if="step.type === 'union'">
      <section class="scf__section">
        <h4 class="scf__section-title">Union settings</h4>
        <div class="scf__field">
          <label class="scf__label">Align columns by</label>
          <ISelect
            :model-value="unionCfg.alignBy"
            size="sm"
            :options="[{ value: 'name', label: 'Column name' }, { value: 'position', label: 'Column position' }]"
            @update:model-value="unionCfg.alignBy = $event as 'name' | 'position'; emit('change')"
          />
        </div>
        <div class="scf__toggle-row">
          <span class="scf__toggle-label">Fill missing values with null（关闭 = 严格模式，列必须一致）</span>
          <IToggle v-model="unionCfg.fillNull" aria-label="Fill missing values with null" @update:model-value="emit('change')" />
        </div>
        <div class="scf__toggle-row">
          <span class="scf__toggle-label">Add source column</span>
          <IToggle v-model="unionCfg.addSourceColumn" aria-label="Add source column" @update:model-value="emit('change')" />
        </div>
      </section>
    </template>

    <template v-else>
      <p class="scf__placeholder">Configuration form for "{{ def.label }}" is not yet implemented in P0.</p>
    </template>
  </div>
</template>

<style scoped>
.scf {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scf__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scf__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.scf__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scf__warn {
  font-size: var(--is-text-xs);
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
}
.scf__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.scf__hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  line-height: 1.5;
}
.scf__placeholder {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.scf__filter {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.scf__filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.scf__combinator {
  width: 96px;
}
.scf__cond {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--is-bg);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
}
.scf__cond-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.scf__cond-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.scf__cond-remove {
  display: inline-flex;
  padding: 2px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
  transition:
    color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.scf__cond-remove:hover:not(:disabled) {
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.scf__cond-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.scf__cond-row {
  display: flex;
  gap: 8px;
}
.scf__cond-col {
  flex: 1;
  min-width: 0;
}
.scf__cond-op {
  flex: 0 0 88px;
}
.scf__cond-val {
  flex: 1;
  min-width: 0;
}
.scf__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  border: 1px dashed var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  color: var(--is-accent);
  font-size: var(--is-text-xs);
  font-weight: 600;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.scf__add:hover {
  background: var(--is-accent-soft);
  border-color: var(--is-accent);
}
.scf__collist {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.scf__colitem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  cursor: pointer;
}
.scf__colitem:hover {
  background: var(--is-surface-hover);
}
.scf__join-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.scf__join-type {
  height: 32px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  text-transform: capitalize;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.scf__join-type:hover {
  border-color: var(--is-border-strong);
}
.scf__join-type--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.scf__keyrow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.scf__keycol {
  flex: 1;
  min-width: 0;
}
.scf__keyeq {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.scf__suffixes {
  display: flex;
  gap: 8px;
}
.scf__suffix {
  flex: 1;
  min-width: 0;
}
.scf__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
}
.scf__toggle-label {
  font-size: var(--is-text-sm);
  color: var(--is-text);
}
</style>
