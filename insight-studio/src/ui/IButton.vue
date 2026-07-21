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
  height: 26px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
}
.is-btn--icon-only.is-btn--md {
  width: 32px;
  padding: 0;
}
.is-btn--icon-only.is-btn--sm {
  width: 26px;
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
