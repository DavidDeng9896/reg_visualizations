<script setup lang="ts">
/**
 * 结构列单元格：异步 RDKit SVG 缩略图 + 点击查看原文。
 * v-html 仅用于 renderStructureSvg 返回的 SVG（可信、非用户 HTML）。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IIcon, IPopover } from '../../../ui'
import { renderStructureSvg } from './render'

const props = defineProps<{
  value: string | null
}>()

const popoverOpen = ref(false)
const loading = ref(false)
const svgHtml = ref<string | null>(null)
const error = ref<string | null>(null)

let generation = 0

const isEmpty = computed(() => props.value == null || props.value === '')

async function load() {
  const text = props.value
  if (text == null || text === '') {
    svgHtml.value = null
    error.value = null
    loading.value = false
    return
  }
  const gen = ++generation
  loading.value = true
  error.value = null
  svgHtml.value = null
  const result = await renderStructureSvg(text, { width: 100, height: 80 })
  if (gen !== generation) return
  loading.value = false
  if (result.ok) {
    svgHtml.value = result.svg
  } else {
    error.value = result.error
  }
}

watch(() => props.value, load, { immediate: true })

onBeforeUnmount(() => {
  generation++
})
</script>

<template>
  <div v-if="isEmpty" class="struct-cell struct-cell--empty" />
  <IPopover
    v-else
    :open="popoverOpen"
    placement="bottom-start"
    :arrow="false"
    panel-class="struct-cell__popover"
    @update:open="popoverOpen = $event"
  >
    <template #anchor>
      <button
        type="button"
        class="struct-cell__trigger"
        :aria-label="error ? '结构式解析失败，点击查看原文' : '查看结构式原文'"
        @click.stop="popoverOpen = !popoverOpen"
        @mouseenter="popoverOpen = true"
      >
        <div v-if="loading" class="struct-cell__skeleton" aria-hidden="true" />
        <div v-else-if="svgHtml" class="struct-cell__svg" v-html="svgHtml" />
        <IIcon v-else-if="error" name="warning" :size="18" class="struct-cell__warn" />
      </button>
    </template>
    <template #default>
      <pre class="struct-cell__text">{{ value }}</pre>
      <p v-if="error" class="struct-cell__err">{{ error }}</p>
    </template>
  </IPopover>
</template>

<style scoped>
.struct-cell {
  display: flex;
  align-items: center;
  min-height: 80px;
}
.struct-cell--empty {
  min-height: 0;
}
.struct-cell__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-radius: var(--is-radius-sm);
  cursor: pointer;
  min-width: 100px;
  min-height: 80px;
}
.struct-cell__trigger:hover {
  background: var(--is-surface-hover);
}
.struct-cell__skeleton {
  width: 100px;
  height: 80px;
  border-radius: var(--is-radius-sm);
  background: linear-gradient(
    90deg,
    var(--is-surface-hover) 25%,
    var(--is-border) 50%,
    var(--is-surface-hover) 75%
  );
  background-size: 200% 100%;
  animation: struct-cell-shimmer 1.2s ease-in-out infinite;
}
@keyframes struct-cell-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.struct-cell__svg {
  width: 100px;
  height: 80px;
  line-height: 0;
}
.struct-cell__svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.struct-cell__warn {
  color: var(--is-warning, #d97706);
}
.struct-cell__text {
  margin: 0;
  padding: 8px 10px;
  font-size: var(--is-text-xs);
  font-family: var(--is-font-mono, ui-monospace, monospace);
  white-space: pre-wrap;
  word-break: break-all;
  max-width: 320px;
  max-height: 200px;
  overflow: auto;
}
.struct-cell__err {
  margin: 0;
  padding: 0 10px 8px;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
}
</style>
