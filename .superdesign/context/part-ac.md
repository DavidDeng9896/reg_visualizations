  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.ccpanel__ft-empty {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ccpanel__ft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccpanel__ft-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  padding: 4px 8px;
}
.ccpanel__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--is-border);
}
.ccpanel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}
</style>
```

=== FILE: src/modules/charts/panel/MappingSlot.vue (from line 72) ===
```
<template>
  <div class="mslot" :class="{ 'mslot--error': !!error }">
    <div class="mslot__head">
      <span class="mslot__label">
        {{ slot.label }}<span v-if="slot.required" class="mslot__req">*</span>
      </span>
    </div>

    <div class="mslot__body">
      <template v-for="(m, i) in mappings" :key="`${m.field}-${i}`">
        <AxisSettingsPopover
          v-if="slot.aggregatable || slot.axisSettings || slot.ySide"
          :open="gearFor === i"
          :slot="slot"
          :mapping="m"
          :axis-key="axisKeyOf"
          @update:open="gearFor = $event ? i : null"
        >
          <template #anchor>
            <IFieldCapsule
              :name="m.field"
              :data-type="colType(m.field)"
              :aggregation="capsuleAgg(m)"
              :configurable="true"
              :removable="true"
              :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
              @configure="gearFor = i"
              @remove="removeAt(i)"
            />
          </template>
        </AxisSettingsPopover>
        <IFieldCapsule
          v-else
          :name="m.field"
          :data-type="colType(m.field)"
          :removable="true"
          :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
          @remove="removeAt(i)"
        />
      </template>

      <ISelect
        v-if="slot.multiple || mappings.length === 0"
        :options="options"
        :placeholder="slot.multiple ? '+ 添加度量' : '选择字段'"
        :searchable="options.length > 6"
        size="sm"
        class="mslot__select"
        :aria-label="slot.label"
        :model-value="null"
        @update:model-value="slot.multiple ? addMapping($event) : setSingle($event)"
      />
    </div>

    <p v-if="missingFields.size" class="mslot__msg mslot__msg--missing">
      列 {{ [...missingFields].map((f) => `「${f}」`).join('、') }} 已不存在，请重新绑定
    </p>
    <p v-else-if="error" class="mslot__msg">{{ error.message }}</p>
  </div>
</template>

<style scoped>
.mslot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  border: 1px solid transparent;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.mslot--error {
  border-color: var(--is-danger);
  background: var(--is-danger-soft);
}
.mslot__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mslot__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.mslot__req {
  color: var(--is-danger);
  margin-left: 2px;
}
.mslot__body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mslot__select {
  flex: 1;
  min-width: 120px;
}
.mslot__capsule--missing {
  border-color: var(--is-danger) !important;
  color: var(--is-danger);
  background: var(--is-danger-soft) !important;
}
.mslot__msg {
  font-size: 11px;
  color: var(--is-danger);
}
.mslot__msg--missing {
  color: var(--is-danger);
}
</style>
```

=== FILE: src/modules/charts/panel/configure/BaseConfigure.vue (from line 162) ===
```
<template>
  <div class="cfg">
    <!-- 映射槽位 -->
    <MappingSlot v-for="slot in def.mappingSlots" :key="slot.key" :slot="slot" />

    <!-- X⇄Y 交换 -->
    <div v-if="caps.swapXY" class="cfg__row">
      <IButton size="sm" variant="ghost" icon="swap" class="cfg__swap" @click="swapXY">交换 X / Y</IButton>
    </div>

    <!-- Bar：方向 / 堆叠 -->
    <div v-if="caps.horizontal" class="cfg__row">
      <span class="cfg__label">方向</span>
      <ISelect
        v-model="direction"
        :options="[
          { value: 'vertical', label: '竖直' },
          { value: 'horizontal', label: '水平' },
        ]"
        size="sm"
        aria-label="柱方向"
      />
    </div>
    <div v-if="caps.stack" class="cfg__row">
      <span class="cfg__label">分组模式</span>
      <ISelect
        v-model="mode"
        :options="[
          { value: 'grouped', label: '并排 (Grouped)' },
          { value: 'stacked', label: '堆叠 (Stacked)' },
        ]"
        size="sm"
        aria-label="分组模式"
      />
    </div>

    <!-- 误差棒 -->
    <div v-if="caps.errorBars" class="cfg__row">
      <span class="cfg__label">Error bars</span>
      <ITooltip :content="meanActive ? '' : '仅在聚合为 Average (Mean) 时可用'" placement="bottom">
        <ISelect
          v-model="errorBars"
          :disabled="!meanActive"
          :options="[
            { value: 'none', label: 'None' },
            { value: 'sd', label: 'Standard Deviation' },
            { value: 'sem', label: 'Standard Error of the Mean' },
          ]"
          size="sm"
          aria-label="误差棒"
        />
      </ITooltip>
    </div>

    <!-- 色板 -->
    <div class="cfg__row">
      <span class="cfg__label">Color palette</span>
      <PalettePicker v-model="palette" :continuous="def.type === 'heatmap'" class="cfg__palette" />
    </div>

    <!-- REGRESSION（6B：Line/Scatter 拟合套件） -->
    <section v-if="caps.regression" class="cfg__section">
      <h4 class="cfg__section-title">REGRESSION</h4>
      <div class="cfg__row">
        <span class="cfg__label">Regression model</span>
        <ISelect v-model="regModel" :options="regressionModels" placeholder="Select a regression type" size="sm" aria-label="回归模型" />
      </div>
      <div class="cfg__row">
        <span class="cfg__label cfg__label--icon">
          Weights
          <ITooltip content="选择数值列作为加权最小二乘的权重（权重越大的点对拟合影响越大）；默认 None = 等权" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <ISelect v-model="regWeights" :options="weightOptions" size="sm" aria-label="权重列" />
      </div>
      <div class="cfg__row cfg__row--switch">
        <span class="cfg__label cfg__label--icon">
          Exclude flagged
          <ITooltip content="开启后，打标（×）的点不参与拟合，但仍显示在图表上" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <IToggle v-model="regExclude" aria-label="Exclude flagged" />
      </div>
      <template v-if="regModel === '4pl'">
        <div class="cfg__row">
          <span class="cfg__label cfg__label--icon">
            Constraints
            <ITooltip content="固定 4PL 的 Min / Max 参数（留空则由算法自动估计）" placement="bottom">
              <IIcon name="info" :size="12" class="cfg__help" />
            </ITooltip>
          </span>
          <div class="cfg__inline">
            <ITextField v-model="constraintMin" type="number" placeholder="Min（可选）" size="sm" aria-label="4PL Min 约束" class="cfg__constraint" />
            <ITextField v-model="constraintMax" type="number" placeholder="Max（可选）" size="sm" aria-label="4PL Max 约束" class="cfg__constraint" />
          </div>
        </div>
        <div class="cfg__row cfg__row--switch">
          <span class="cfg__label">Show asymptotes</span>
          <IToggle v-model="regAsymptotes" aria-label="显示渐近线" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cfg__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 0 8px;
}
.cfg__row--inline {
  flex-direction: row;
  align-items: center;
}
.cfg__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.cfg__row--disabled {
  opacity: 0.55;
}
.cfg__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cfg__row :deep(.is-select) {
  flex: 1;
}
.cfg__palette {
  flex: 1;
  min-width: 0;
}
.cfg__section {
  margin-top: 8px;
  padding: 10px 8px 4px;
  border-top: 1px solid var(--is-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cfg__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
}
.cfg__label--icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cfg__help {
  color: var(--is-text-tertiary);
  cursor: help;
}
.cfg__constraint {
  flex: 1;
  min-width: 0;
}
.cfg__inline {
  display: flex;
  gap: 8px;
}
.cfg__swap {
  align-self: flex-start;
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

=== FILE: src/ui/ITabs.vue (from line 1) ===
```
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

export interface TabItem {
  key: string
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const tabEls = ref<HTMLElement[]>([])
const indicator = ref<{ left: number; width: number }>({ left: 0, width: 0 })

function select(key: string) {
  const tab = props.tabs.find((t) => t.key === key)
  if (!tab || tab.disabled) return
  emit('update:modelValue', key)
}

async function updateIndicator() {
  await nextTick()
  const idx = props.tabs.findIndex((t) => t.key === props.modelValue)
  const el = tabEls.value?.[idx]
  if (el) indicator.value = { left: el.offsetLeft, width: el.offsetWidth }
}
