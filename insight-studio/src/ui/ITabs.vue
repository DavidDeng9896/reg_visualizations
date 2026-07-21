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

function onKeydown(e: KeyboardEvent, idx: number) {
  let next = -1
  if (e.key === 'ArrowRight') next = (idx + 1) % props.tabs.length
  else if (e.key === 'ArrowLeft') next = (idx - 1 + props.tabs.length) % props.tabs.length
  if (next >= 0) {
    e.preventDefault()
    tabEls.value[next]?.focus()
    select(props.tabs[next].key)
  }
}

onMounted(updateIndicator)
watch(() => [props.modelValue, props.tabs], updateIndicator, { deep: true })
</script>

<template>
  <div class="is-tabs" role="tablist">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.key"
      ref="tabEls"
      type="button"
      class="is-tabs__tab"
      :class="{ 'is-tabs__tab--active': tab.key === modelValue }"
      role="tab"
      :aria-selected="tab.key === modelValue"
      :tabindex="tab.key === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      @click="select(tab.key)"
      @keydown="onKeydown($event, i)"
    >
      {{ tab.label }}
    </button>
    <span
      class="is-tabs__indicator"
      :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.is-tabs {
  position: relative;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--is-border);
}
.is-tabs__tab {
  padding: 8px 12px;
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text-secondary);
  border-radius: var(--is-radius-sm) var(--is-radius-sm) 0 0;
  transition: color var(--is-dur-fast) var(--is-ease);
}
.is-tabs__tab:hover:not(:disabled) {
  color: var(--is-text);
}
.is-tabs__tab--active {
  color: var(--is-accent);
}
.is-tabs__tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--is-accent);
  border-radius: 2px;
  transition:
    transform var(--is-dur) var(--is-ease),
    width var(--is-dur) var(--is-ease);
}
</style>
