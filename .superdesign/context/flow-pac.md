}
.step-panel--fullscreen {
  width: 100%;
}
.step-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.step-panel__name {
  font-weight: 600;
}
.step-panel__type {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.step-panel__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.step-panel__action {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.step-panel__action:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.step-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-panel__preview {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}
.step-panel__preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.step-panel__preview-count {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.step-panel__preview-stats {
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-stat b {
  color: var(--is-text);
  font-weight: 600;
}
.step-panel__preview-table-wrap {
  overflow: auto;
  max-height: 260px;
}
.step-panel__preview-table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--is-text-xs);
}
.step-panel__preview-table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--is-border);
  color: var(--is-text-secondary);
}
.step-panel__preview-loading,
.step-panel__preview-empty {
  padding: 16px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.step-panel__preview-error {
  padding: 12px;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.step-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--is-border);
}
.step-panel__footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-panel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}

.step-panel-enter-active,
.step-panel-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.step-panel-enter-from,
.step-panel-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
```

=== FILE: src/modules/steps/panel/StepConfigForm.vue (from line 176) ===
```
<template>
  <div class="scf">
    <p v-if="!inputTable && def.inputs.length > 0" class="scf__warn">无法解析输入表，请先连接输入端口。</p>

    <!-- Filter -->
    <template v-if="step.type === 'filter'">
      <div v-for="(filter, fidx) in step.config.filters as Filter[]" :key="filter.id" class="scf__filter">
        <div class="scf__filter-head">
          <ISelect
            :model-value="filter.combinator"
            size="sm"
            :options="[{ value: 'and', label: 'And' }, { value: 'or', label: 'Or' }]"
            @update:model-value="filter.combinator = $event as 'and' | 'or'; emit('change')"
          />
          <IButton variant="ghost" icon="trash" size="sm" @click="removeFilter(fidx)">Remove</IButton>
        </div>
        <div v-for="(cond, cidx) in filter.conditions" :key="cond.id" class="scf__cond">
          <ISelect :model-value="cond.column" size="sm" aria-label="Filter column" :options="columnOptions" @update:model-value="onCondColumnChange(cond, $event)" />
          <ISelect :model-value="cond.operator" size="sm" aria-label="Filter operator" :options="operatorOptions(cond)" @update:model-value="onCondOperatorChange(cond, $event)" />
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
            <ITextField
              :model-value="condValueText(cond)"
              size="sm"
              placeholder="min"
              aria-label="Filter min value"
              @update:model-value="onCondValueInput(cond, $event)"
            />
            <ITextField
              :model-value="cond.value2 === null || cond.value2 === undefined ? '' : String(cond.value2)"
              size="sm"
              placeholder="max"
              aria-label="Filter max value"
              @update:model-value="onCondValue2Input(cond, $event)"
            />
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
          <IButton variant="ghost" icon="trash" size="sm" :disabled="filter.conditions.length <= 1" @click="removeCondition(filter, cidx)" />
        </div>
        <IButton variant="ghost" icon="plus" size="sm" @click="addCondition(filter)">Add condition</IButton>
      </div>
      <IButton variant="ghost" icon="plus" @click="addFilter">Add filter group</IButton>
    </template>

    <!-- Hide columns -->
    <template v-else-if="step.type === 'hide-columns'">
      <div class="scf__mode">
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
    </template>

    <!-- Computed column -->
    <template v-else-if="step.type === 'computed-column'">
      <label class="scf__label">New column name</label>
      <ITextField v-model="computedCfg.name" size="sm" @input="emit('change')" />
      <label class="scf__label">Expression</label>
      <ITextField v-model="computedCfg.expression" size="sm" placeholder="e.g. round(value * 2, 1)" @input="emit('change')" />
      <p class="scf__hint">
        Supports + - * / parentheses numbers 'strings' and functions:
        if(cond,a,b) round(x,n) abs sqrt log ln min max year month day concat(...).
        Use [column name] for names with spaces.
      </p>
    </template>

    <!-- Join -->
    <template v-else-if="step.type === 'join'">
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

      <label class="scf__label">Join keys</label>
      <div v-for="(k, i) in joinCfg.keys" :key="i" class="scf__keyrow">
        <ISelect :model-value="k.left" size="sm" :options="columnOptions" placeholder="Left column" @update:model-value="k.left = String($event); emit('change')" />
        <span>=</span>
        <ISelect :model-value="k.right" size="sm" :options="rightColumnOptions" placeholder="Right column" @update:model-value="k.right = String($event); emit('change')" />
        <IButton variant="ghost" icon="trash" size="sm" :disabled="joinCfg.keys.length <= 1" @click="removeJoinKey(i)" />
      </div>
      <IButton variant="ghost" icon="plus" size="sm" @click="addJoinKey">Add key</IButton>

      <label class="scf__label">Suffixes</label>
      <div class="scf__suffixes">
        <ITextField v-model="joinCfg.suffixes[0]" size="sm" placeholder="left suffix" @input="emit('change')" />
        <ITextField v-model="joinCfg.suffixes[1]" size="sm" placeholder="right suffix" @input="emit('change')" />
      </div>
    </template>

    <!-- Union -->
    <template v-else-if="step.type === 'union'">
      <label class="scf__label">Align columns by</label>
      <ISelect
        :model-value="unionCfg.alignBy"
        size="sm"
        :options="[{ value: 'name', label: 'Column name' }, { value: 'position', label: 'Column position' }]"
        @update:model-value="unionCfg.alignBy = $event as 'name' | 'position'; emit('change')"
      />
      <label class="scf__colitem">
        <input v-model="unionCfg.fillNull" type="checkbox" @change="emit('change')" />
        <span>Fill missing values with null（关闭 = 严格模式，列必须一致）</span>
      </label>
      <label class="scf__colitem">
        <input v-model="unionCfg.addSourceColumn" type="checkbox" @change="emit('change')" />
        <span>Add source column</span>
      </label>
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.scf__filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.scf__cond {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.scf__mode {
  max-width: 200px;
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
  padding: 6px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  text-transform: capitalize;
}
.scf__join-type--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.scf__keyrow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.scf__suffixes {
  display: flex;
  gap: 8px;
}
</style>
```

=== FILE: src/ui/IButton.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: IconName
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    title?: string
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const isDisabled = computed(() => props.disabled || props.loading)

function onClick(ev: MouseEvent) {
  if (isDisabled.value) return
  emit('click', ev)
}
</script>

<template>
  <button
    class="is-btn"
    :class="[`is-btn--${variant}`, `is-btn--${size}`, { 'is-btn--loading': loading, 'is-btn--icon-only': icon && !$slots.default }]"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :title="title"
    @click="onClick"
  >
    <span v-if="loading" class="is-btn__spinner" aria-hidden="true" />
    <IIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 13 : 15" />
    <span v-if="$slots.default" class="is-btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.is-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--is-radius-sm);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    opacity var(--is-dur-fast) var(--is-ease);
}
.is-btn--md {
  height: 32px;
  padding: 0 14px;
  font-size: var(--is-text-sm);
}
.is-btn--sm {
  height: 28px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
}
.is-btn--icon-only.is-btn--md {
  width: 32px;
  padding: 0;
}
.is-btn--icon-only.is-btn--sm {
  width: 28px;
  padding: 0;
}

.is-btn--primary {
  background: var(--is-primary);
  color: var(--is-text-inverse);
}
.is-btn--primary:hover:not(:disabled) {
  background: var(--is-primary-hover);
}
.is-btn--primary:active:not(:disabled) {
  background: var(--is-primary-active);
}

.is-btn--secondary {
  background: var(--is-surface);
  border-color: var(--is-border-strong);
  color: var(--is-text);
  box-shadow: var(--is-shadow-sm);
}
.is-btn--secondary:hover:not(:disabled) {
  background: var(--is-surface-hover);
  border-color: var(--is-text-tertiary);
}

.is-btn--ghost {
  background: transparent;
  color: var(--is-text-secondary);
}
.is-btn--ghost:hover:not(:disabled) {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.is-btn--danger {
  background: var(--is-danger);
  color: var(--is-text-inverse);
}
.is-btn--danger:hover:not(:disabled) {
  background: var(--is-danger-hover);
}

.is-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-btn:focus-visible {
  box-shadow: var(--is-ring);
}

.is-btn__spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: is-btn-spin 0.7s linear infinite;
}
@keyframes is-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

=== FILE: src/ui/ITextField.vue (from line 1) ===
```
<script setup lang="ts">
import { ref, useId } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    error?: boolean | string
    size?: 'sm' | 'md'
    prefixIcon?: IconName
    clearable?: boolean
    type?: string
    autofocus?: boolean
    ariaLabel?: string
  }>(),
  { modelValue: '', size: 'md', type: 'text' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enter'): void
  (e: 'escape'): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const id = useId()
const inputEl = ref<HTMLInputElement>()

function onInput(ev: Event) {
  emit('update:modelValue', (ev.target as HTMLInputElement).value)
}
function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter') emit('enter')
  if (ev.key === 'Escape') emit('escape')
}
function clear() {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}
defineExpose({ focus: () => inputEl.value?.focus(), select: () => inputEl.value?.select() })
</script>

<template>
  <div
    class="is-field"
    :class="[`is-field--${size}`, { 'is-field--error': !!error, 'is-field--disabled': disabled }]"
  >
    <IIcon v-if="prefixIcon" :name="prefixIcon" :size="14" class="is-field__prefix" />
    <input
      :id="id"
      ref="inputEl"
      class="is-field__input"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel ?? placeholder"
      :aria-invalid="!!error || undefined"
      :autofocus="autofocus || undefined"
      @input="onInput"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="is-field__clear"
      aria-label="清除"
      @click="clear"
    >
      <IIcon name="close" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.is-field {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.is-field--md {
  height: 32px;
}
.is-field--sm {
  height: 28px;
  padding: 0 8px;
}
.is-field:focus-within {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-field--error,
.is-field--error:focus-within {
  border-color: var(--is-danger);
}
.is-field--error:focus-within {
  box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.18);
}
.is-field--disabled {
  background: var(--is-surface-hover);
  opacity: 0.6;
}
.is-field__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--is-text-sm);
  height: 100%;
}
.is-field--sm .is-field__input {
  font-size: var(--is-text-xs);
}
.is-field__prefix {
  color: var(--is-text-tertiary);
}
.is-field__clear {
  display: inline-flex;
  color: var(--is-text-tertiary);
  border-radius: 50%;
  padding: 2px;
}
.is-field__clear:hover {
  color: var(--is-text);
  background: var(--is-surface-hover);
}
</style>
```

=== FILE: src/ui/ISelect.vue (from line 159) ===
```
<template>
  <div ref="rootEl" class="is-select" :class="[`is-select--${size}`, `is-select--${variant}`, { 'is-select--open': open }]">
    <button
      type="button"
      class="is-select__trigger"
      :disabled="disabled"
      role="combobox"
      :aria-expanded="open"
      :aria-label="ariaLabel ?? placeholder"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <IIcon v-if="selected?.icon" :name="selected.icon" :size="14" class="is-select__trigger-icon" />
      <span class="is-select__value is-ellipsis" :class="{ 'is-select__value--placeholder': !selected }">
        {{ selected?.label ?? placeholder ?? '请选择' }}
      </span>
      <IIcon name="chevron-down" :size="13" class="is-select__chevron" />
    </button>

    <Teleport to="body">
      <Transition name="is-select-panel">
        <div
          v-if="open"
          ref="panelEl"
          class="is-select__panel"
          :style="panelStyle"
          data-is-floating="1"
          role="presentation"
          @click.stop
        >
          <div v-if="searchable" class="is-select__search">
            <input
              ref="searchEl"
              v-model="query"
              class="is-select__search-input"
              type="text"
              placeholder="搜索…"
              aria-label="搜索选项"
              @keydown="onListKeydown"
            />
          </div>
          <div ref="listEl" class="is-select__list" role="listbox" :aria-activedescendant="undefined">
            <template v-for="(opt, i) in filtered" :key="String(opt.value)">
              <div v-if="showGroupHeader(i)" class="is-select__group">{{ opt.group }}</div>
              <button
                type="button"
                class="is-select__option"
                :class="{ 'is-select__option--active': i === activeIndex, 'is-select__option--selected': opt.value === modelValue }"
                role="option"
                :aria-selected="opt.value === modelValue"
                :disabled="opt.disabled"
                @click="selectAt(i)"
                @mousemove="activeIndex = i"
              >
                <IIcon v-if="opt.icon" :name="opt.icon" :size="14" />
                <span class="is-ellipsis">{{ opt.label }}</span>
                <IIcon v-if="opt.value === modelValue" name="check" :size="13" class="is-select__check" />
              </button>
            </template>
            <div v-if="!filtered.length" class="is-select__empty">无匹配选项</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.is-select {
  position: relative;
  display: inline-block;
  min-width: 0;
}
.is-select__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  font-size: var(--is-text-sm);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.is-select--md .is-select__trigger {
  height: 32px;
}
.is-select--sm .is-select__trigger {
  height: 28px;
  font-size: var(--is-text-xs);
}
/* ghost：无框文字下拉，仅 hover 浅灰底 */
