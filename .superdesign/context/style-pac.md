          ]"
          size="sm"
          aria-label="列排序"
          @update:model-value="heatmap.colSort = $event as 'label' | 'mean'; ctx.touch()"
        />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">聚类</span>
        <div class="sty__inline">
          <IToggle :model-value="!!heatmap.clusterRows" @update:model-value="heatmap.clusterRows = $event; ctx.touch()">行</IToggle>
          <IToggle :model-value="!!heatmap.clusterCols" @update:model-value="heatmap.clusterCols = $event; ctx.touch()">列</IToggle>
        </div>
      </div>
    </section>

    <!-- Legend -->
    <section class="sty__sec">
      <h4 class="sty__sec-title">Legend</h4>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">显示图例</span>
        <IToggle v-model="legendShow" aria-label="显示图例" />
      </div>
      <div v-if="legendShow" class="sty__row">
        <span class="sty__label">Position</span>
        <ISelect
          v-model="legendPos"
          :options="[
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]"
          size="sm"
          aria-label="图例位置"
        />
      </div>
    </section>

    <!-- Axis -->
    <AxisSection v-if="showXAxis" title="X-Axis" axis-key="xAxis" :with-scale="xScaleTypes.includes(type)" />
    <AxisSection v-if="showYAxis" :title="caps.secondY && useRightAxis ? 'Y-Axis (Left)' : 'Y-Axis'" axis-key="yAxis" :with-scale="yScaleTypes.includes(type)" />
    <AxisSection v-if="caps.secondY && useRightAxis" title="Y-Axis (Right)" axis-key="yAxisRight" :with-scale="true" />

    <!-- Series colors -->
    <SeriesColorsSection />
  </div>
</template>

<style scoped>
.sty {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sty__sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.sty__sec:first-child {
  border-top: none;
}
.sty__sec-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.sty__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.sty__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.sty__row :deep(.is-field),
.sty__row :deep(.is-select),
.sty__row :deep(.is-slider) {
  flex: 1;
  min-width: 0;
}
.sty__margins {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.sty__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sty__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.sty__inline :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
</style>
```

=== FILE: src/modules/charts/panel/style/AxisSection.vue (from line 69) ===
```
<template>
  <section class="axis-sec">
    <h4 class="axis-sec__title">{{ title }}</h4>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Label</span>
      <ITextField v-model="label" size="sm" clearable :placeholder="defaultLabel ?? '默认'" />
    </div>
    <div v-if="withScale" class="axis-sec__row axis-sec__row--switch">
      <span class="axis-sec__label">Scale</span>
      <IToggle :model-value="scale === 'log'" aria-label="Scale Log/Linear" @update:model-value="scale = $event ? 'log' : 'linear'">
        {{ scale === 'log' ? 'Log' : 'Linear' }}
      </IToggle>
    </div>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Range</span>
      <ISelect
        v-model="range"
        :options="[
          { value: 'auto', label: 'Automatic' },
          { value: 'manual', label: 'Manual (min/max)' },
        ]"
        size="sm"
        aria-label="Range"
      />
    </div>
    <div v-if="range === 'manual'" class="axis-sec__row">
      <span class="axis-sec__label">Min / Max</span>
      <div class="axis-sec__inline">
        <ITextField v-model="minStr" size="sm" placeholder="Min" aria-label="最小值" />
        <ITextField v-model="maxStr" size="sm" placeholder="Max" aria-label="最大值" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.axis-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.axis-sec__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.axis-sec__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.axis-sec__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.axis-sec__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.axis-sec__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.axis-sec__row :deep(.is-select),
.axis-sec__inline :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
</style>
```

=== FILE: src/modules/charts/panel/style/ColorField.vue (from line 1) ===
```
<script setup lang="ts">
import { ref } from 'vue'
import { IColorPicker, IPopover } from '../../../../ui'

/** 颜色表单行：标签 + 色块 + popover picker。 */
withDefaults(defineProps<{ modelValue: string; label: string }>(), {})
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const open = ref(false)
</script>

<template>
  <div class="cf">
    <span class="cf__label">{{ label }}</span>
    <div class="cf__control">
      <IPopover :open="open" placement="bottom-start" :arrow="false" @update:open="open = $event">
        <template #anchor>
          <button
            type="button"
            class="cf__swatch"
            :style="{ background: modelValue }"
            :aria-label="`修改${label}`"
            @click="open = !open"
          />
        </template>
        <template #default>
          <div class="cf__picker">
            <IColorPicker :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />
          </div>
        </template>
      </IPopover>
      <span class="cf__hex">{{ modelValue }}</span>
    </div>
  </div>
</template>

<style scoped>
.cf {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.cf__control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cf__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cf__swatch {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid rgba(16, 24, 40, 0.15);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.cf__swatch:hover {
  transform: scale(1.1);
}
.cf__hex {
  font-family: var(--is-font-mono);
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.cf__picker {
  padding: 10px;
}
</style>
```

=== FILE: src/modules/charts/panel/style/SeriesColorsSection.vue (from line 35) ===
```
<template>
  <section v-if="names.length" class="scolors">
    <h4 class="scolors__title">Series colors</h4>
    <div v-for="(name, i) in names" :key="name" class="scolors__row">
      <IPopover :open="openFor === name" placement="bottom-start" :arrow="false" @update:open="openFor = $event ? name : null">
        <template #anchor>
          <button
            type="button"
            class="scolors__swatch"
            :style="{ background: colorOf(name, i) }"
            :aria-label="`修改「${name}」颜色`"
            @click="openFor = openFor === name ? null : name"
          />
        </template>
        <template #default>
          <div class="scolors__picker">
            <IColorPicker :model-value="colorOf(name, i)" @update:model-value="setColor(name, $event)" />
          </div>
        </template>
      </IPopover>
      <span class="scolors__name is-ellipsis" :title="name">{{ name }}</span>
      <ITextField
        :model-value="labelOf(name)"
        size="sm"
        placeholder="图例标签"
        :aria-label="`「${name}」图例标签`"
        class="scolors__label"
        @update:model-value="setLabel(name, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.scolors {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.scolors__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.scolors__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.scolors__swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(16, 24, 40, 0.15);
  flex-shrink: 0;
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.scolors__swatch:hover {
  transform: scale(1.12);
}
.scolors__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-xs);
}
.scolors__label {
  width: 96px;
  flex-shrink: 0;
}
.scolors__picker {
  padding: 10px;
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

=== FILE: src/ui/ISlider.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    /** 是否在尾部显示当前值。 */
    showValue?: boolean
    format?: (v: number) => string
    ariaLabel?: string
  }>(),
  { min: 0, max: 100, step: 1, showValue: true },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const pct = computed(() => ((props.modelValue - props.min) / (props.max - props.min || 1)) * 100)

function onInput(e: Event) {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="is-slider" :class="{ 'is-slider--disabled': disabled }">
    <input
      type="range"
      class="is-slider__input"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :style="{ '--is-slider-pct': `${pct}%` }"
      @input="onInput"
    />
    <span v-if="showValue" class="is-slider__value">{{ format ? format(modelValue) : modelValue }}</span>
  </div>
</template>

<style scoped>
.is-slider {
  display: flex;
  align-items: center;
  gap: 10px;
}
.is-slider--disabled {
  opacity: 0.5;
}
.is-slider__input {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--is-accent) var(--is-slider-pct, 0%),
    var(--is-border-strong) var(--is-slider-pct, 0%)
  );
  outline: none;
  cursor: pointer;
}
.is-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--is-accent);
  box-shadow: var(--is-shadow-sm);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-slider__input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.is-slider__input::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--is-accent);
}
.is-slider__input:focus-visible {
  box-shadow: var(--is-ring);
}
.is-slider__value {
  min-width: 32px;
  text-align: right;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
```

=== FILE: src/ui/IColorSwatch.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'

const props = withDefaults(
  defineProps<{
    color: string
    selected?: boolean
    size?: number
    title?: string
  }>(),
  { size: 20 },
)

const emit = defineEmits<{ (e: 'select', color: string): void }>()
</script>

<template>
  <button
    type="button"
    class="is-swatch"
    :class="{ 'is-swatch--selected': selected }"
    :style="{ background: color, width: `${size}px`, height: `${size}px` }"
    :aria-pressed="selected"
    :title="title ?? color"
    :aria-label="`颜色 ${color}`"
    @click="emit('select', color)"
  >
    <IIcon v-if="selected" name="check" :size="12" class="is-swatch__check" />
  </button>
</template>

<style scoped>
.is-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--is-radius-sm);
  border: 1px solid rgba(16, 24, 40, 0.12);
  transition:
    transform var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.is-swatch:hover {
  transform: scale(1.12);
}
.is-swatch--selected {
  box-shadow:
    0 0 0 2px var(--is-surface),
    0 0 0 4px var(--is-accent);
}
.is-swatch__check {
  color: #fff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.6));
}
</style>
```

=== FILE: src/ui/IColorPicker.vue (from line 1) ===
```
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IColorSwatch from './IColorSwatch.vue'
import { PRESET_COLORS } from './colors'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    presets?: string[]
  }>(),
  { modelValue: '#2e5bff' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const colors = computed(() => props.presets ?? PRESET_COLORS)

const hex = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (hex.value = v),
)

const hexError = ref(false)

function normalizeHex(v: string): string | null {
  const s = v.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s.split('').map((c) => c + c).join('')}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`.toLowerCase()
  return null
}

function applyHex() {
  const v = normalizeHex(hex.value)
  if (v) {
    hexError.value = false
    emit('update:modelValue', v)
  } else {
    hexError.value = true
  }
}
</script>

<template>
  <div class="is-colorpicker">
    <div class="is-colorpicker__grid" role="listbox" aria-label="预设颜色">
      <IColorSwatch
        v-for="c in colors"
        :key="c"
        :color="c"
        :selected="modelValue?.toLowerCase() === c.toLowerCase()"
        @select="emit('update:modelValue', $event)"
      />
    </div>
    <div class="is-colorpicker__custom">
      <span class="is-colorpicker__preview" :style="{ background: normalizeHex(hex) ?? 'transparent' }" />
      <input
        v-model="hex"
        class="is-colorpicker__hex"
        :class="{ 'is-colorpicker__hex--error': hexError }"
        type="text"
        placeholder="#2e5bff"
        aria-label="自定义颜色 hex"
        spellcheck="false"
        @keydown.enter.prevent="applyHex"
        @blur="applyHex"
      />
    </div>
  </div>
</template>

<style scoped>
.is-colorpicker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.is-colorpicker__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}
.is-colorpicker__custom {
  display: flex;
  align-items: center;
  gap: 8px;
}
.is-colorpicker__preview {
  width: 24px;
  height: 24px;
  border-radius: var(--is-radius-sm);
  border: 1px solid var(--is-border-strong);
  flex-shrink: 0;
}
.is-colorpicker__hex {
  flex: 1;
  height: 28px;
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-family: var(--is-font-mono);
  font-size: var(--is-text-xs);
  outline: none;
  transition: border-color var(--is-dur-fast) var(--is-ease);
}
.is-colorpicker__hex:focus {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring);
}
.is-colorpicker__hex--error {
  border-color: var(--is-danger);
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
