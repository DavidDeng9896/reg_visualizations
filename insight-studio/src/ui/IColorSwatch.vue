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
