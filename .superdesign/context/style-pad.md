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
.is-select--ghost .is-select__trigger {
  border-color: transparent;
  background: transparent;
  padding: 0 6px;
  font-weight: 500;
  width: auto;
}
.is-select--ghost .is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--ghost.is-select--open .is-select__trigger,
.is-select--ghost .is-select__trigger:focus-visible {
  border-color: transparent;
  box-shadow: none;
  background: var(--is-surface-hover);
}
.is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--open .is-select__trigger,
.is-select__trigger:focus-visible {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.is-select__trigger-icon {
  color: var(--is-text-secondary);
}
.is-select__value {
  flex: 1;
  text-align: left;
}
.is-select__value--placeholder {
  color: var(--is-text-tertiary);
}
.is-select__chevron {
  color: var(--is-text-tertiary);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-select--open .is-select__chevron {
  transform: rotate(180deg);
}

.is-select__panel {
  /* position/top/left from teleported fixed style */
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}
.is-select__search {
  padding: 6px;
  border-bottom: 1px solid var(--is-border);
}
.is-select__search-input {
  width: 100%;
  height: 26px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-size: var(--is-text-xs);
  outline: none;
}
.is-select__search-input:focus {
  border-color: var(--is-accent);
}
.is-select__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.is-select__group {
  padding: 6px 8px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.is-select__option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.is-select__option--active {
  background: var(--is-accent-soft);
}
.is-select__option--selected {
  color: var(--is-accent);
  font-weight: 500;
}
.is-select__option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-select__check {
  margin-left: auto;
}
.is-select__empty {
  padding: 12px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}

.is-select-panel-enter-active,
.is-select-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
  transform-origin: top left;
}
.is-select-panel-enter-from,
.is-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
```

=== FILE: src/ui/IFieldCapsule.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { DataType } from '../shared/types'

/** 字段胶囊：Aa/# 类型图标 + 名称 + 可选齿轮 + ×（图表映射槽位用）。 */
const props = withDefaults(
  defineProps<{
    name: string
    dataType?: DataType
    /** 聚合显示（如 'Average of Concentration'）。 */
    aggregation?: string
    removable?: boolean
    configurable?: boolean
    active?: boolean
  }>(),
  { dataType: 'string' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'configure'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-capsule"
    :class="{ 'is-capsule--active': active }"
    :title="`${name}（${dataType}）`"
    role="button"
    tabindex="0"
    @click="emit('click')"
    @keydown.enter="emit('click')"
  >
    <IIcon
      :name="dataType === 'number' ? 'type-number' : 'type-text'"
      :size="13"
      class="is-capsule__type"
    />
    <span class="is-capsule__name is-ellipsis">
      <template v-if="aggregation">{{ aggregation }} of </template>{{ name }}
    </span>
    <button
      v-if="configurable"
      type="button"
      class="is-capsule__action"
      aria-label="字段设置"
      @click.stop="emit('configure')"
    >
      <IIcon name="sliders" :size="12" />
    </button>
    <button
      v-if="removable"
      type="button"
      class="is-capsule__action"
      aria-label="移除字段"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="11" />
    </button>
  </span>
</template>

<style scoped>
.is-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 3px 8px;
  background: var(--is-surface-hover);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  color: var(--is-text);
  cursor: default;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-capsule:hover {
  background: #e9edf3;
  border-color: var(--is-border-strong);
}
.is-capsule--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
}
.is-capsule__type {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.is-capsule__name {
  min-width: 0;
}
.is-capsule__action {
  display: inline-flex;
  padding: 2px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.is-capsule__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}
</style>
```
