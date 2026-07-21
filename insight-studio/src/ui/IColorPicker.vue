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
