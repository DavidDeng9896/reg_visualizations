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
