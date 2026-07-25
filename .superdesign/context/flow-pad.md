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

=== FILE: src/ui/IToggle.vue (from line 1) ===
```
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
  }>(),
  {},
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label class="is-toggle" :class="{ 'is-toggle--disabled': disabled }">
    <button
      type="button"
      class="is-toggle__track"
      :class="{ 'is-toggle__track--on': modelValue }"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="is-toggle__thumb" />
    </button>
    <span v-if="label || $slots.default" class="is-toggle__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.is-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.is-toggle--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.is-toggle__track {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: var(--is-radius-full);
  background: var(--is-border-strong);
  transition: background-color var(--is-dur-fast) var(--is-ease);
  flex-shrink: 0;
}
.is-toggle__track--on {
  background: var(--is-accent);
}
.is-toggle__track:focus-visible {
  box-shadow: var(--is-ring);
}
.is-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--is-shadow-sm);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-toggle__track--on .is-toggle__thumb {
  transform: translateX(14px);
}
.is-toggle__label {
  font-size: var(--is-text-sm);
}
</style>
```

=== FILE: src/ui/IBadge.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'yellow' | 'red'

/** 过滤/转换 chip 与小徽标。 */
withDefaults(
  defineProps<{
    tone?: BadgeTone
    icon?: IconName
    removable?: boolean
    clickable?: boolean
  }>(),
  { tone: 'gray' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-badge"
    :class="[`is-badge--${tone}`, { 'is-badge--clickable': clickable }]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('click')"
    @keydown.enter="clickable && emit('click')"
  >
    <IIcon v-if="icon" :name="icon" :size="12" />
    <span class="is-ellipsis"><slot /></span>
    <button
      v-if="removable"
      type="button"
      class="is-badge__remove"
      aria-label="移除"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="10" />
    </button>
  </span>
</template>

<style scoped>
.is-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  font-size: var(--is-text-xs);
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-badge--gray {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  border-color: var(--is-border);
}
.is-badge--blue {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  border-color: #d3dfff;
}
.is-badge--green {
  background: var(--is-success-soft);
  color: var(--is-success);
  border-color: #cdeede;
}
.is-badge--yellow {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  border-color: #f3e3b3;
}
.is-badge--red {
  background: var(--is-danger-soft);
  color: var(--is-danger);
  border-color: #f6d2ce;
}
.is-badge--clickable {
  cursor: pointer;
}
.is-badge--clickable:hover {
  filter: brightness(0.96);
}
.is-badge__remove {
  display: inline-flex;
  padding: 1px;
  border-radius: 50%;
  color: inherit;
  opacity: 0.7;
}
.is-badge__remove:hover {
  opacity: 1;
  background: rgba(16, 24, 40, 0.1);
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

=== FILE: src/ui/IIcon.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const def = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="is-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <text
      v-if="def.kind === 'text'"
      x="12"
      y="16.5"
      text-anchor="middle"
      fill="currentColor"
      :font-size="name === 'type-number' ? 15 : 12"
      font-weight="600"
      font-family="var(--is-font)"
      >{{ def.text }}</text
    >
    <g
      v-else-if="def.kind === 'stroke'"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="def.content"
    />
    <g v-else fill="currentColor" v-html="def.content" />
  </svg>
</template>

<style scoped>
.is-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
```
