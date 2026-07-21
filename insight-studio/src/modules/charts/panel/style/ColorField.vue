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
</template>

<style scoped>
.cf {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cf__label {
  flex-shrink: 0;
  width: 92px;
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
