<script setup lang="ts">
/**
 * 结构列单元格：视口内才渲染 RDKit SVG；点击浮层查看大图 + SMILES。
 * compact：紧凑缩略图（看板表格组件等高密度表格）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IIcon, IPopover } from '../../../ui'
import {
  renderStructureSvg,
  STRUCTURE_PREVIEW_HEIGHT,
  STRUCTURE_PREVIEW_WIDTH,
  STRUCTURE_THUMB_COMPACT_HEIGHT,
  STRUCTURE_THUMB_COMPACT_WIDTH,
  STRUCTURE_THUMB_HEIGHT,
  STRUCTURE_THUMB_WIDTH,
} from './render'

const props = defineProps<{
  value: string | null
  /** 紧凑缩略图（看板等高密度表格）；默认标准尺寸。 */
  compact?: boolean
}>()

const thumbWidth = computed(() => (props.compact ? STRUCTURE_THUMB_COMPACT_WIDTH : STRUCTURE_THUMB_WIDTH))
const thumbHeight = computed(() => (props.compact ? STRUCTURE_THUMB_COMPACT_HEIGHT : STRUCTURE_THUMB_HEIGHT))

const rootEl = ref<HTMLElement | null>(null)
const inView = ref(false)
const popoverOpen = ref(false)
const loading = ref(false)
const svgHtml = ref<string | null>(null)
const previewSvg = ref<string | null>(null)
const previewLoading = ref(false)
const error = ref<string | null>(null)

let generation = 0
let previewGen = 0
let io: IntersectionObserver | null = null

const isEmpty = computed(() => props.value == null || props.value === '')

async function loadThumb() {
  if (!inView.value) return
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
  const result = await renderStructureSvg(text, {
    width: thumbWidth.value,
    height: thumbHeight.value,
  })
  if (gen !== generation) return
  loading.value = false
  if (result.ok) {
    svgHtml.value = result.svg
  } else {
    svgHtml.value = null
    error.value = result.error
  }
}

async function loadPreview() {
  const text = props.value
  if (text == null || text === '') {
    previewSvg.value = null
    return
  }
  const gen = ++previewGen
  previewLoading.value = true
  previewSvg.value = null
  const result = await renderStructureSvg(text, {
    width: STRUCTURE_PREVIEW_WIDTH,
    height: STRUCTURE_PREVIEW_HEIGHT,
  })
  if (gen !== previewGen) return
  previewLoading.value = false
  if (result.ok) previewSvg.value = result.svg
}

watch(
  () => props.value,
  () => {
    svgHtml.value = null
    if (inView.value) void loadThumb()
  },
)

watch(inView, (v) => {
  if (v) void loadThumb()
})

watch(popoverOpen, (open) => {
  if (open) void loadPreview()
  else {
    previewGen++
    previewSvg.value = null
    previewLoading.value = false
  }
})

onMounted(() => {
  void nextTick(() => {
    const el = rootEl.value
    if (!el || typeof IntersectionObserver === 'undefined') {
      inView.value = true
      return
    }
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            inView.value = true
            // 进入视口后保持，避免快速滚动反复销毁重绘
            io?.unobserve(e.target)
          }
        }
      },
      { root: null, rootMargin: '120px', threshold: 0.01 },
    )
    io.observe(el)
  })
})

onBeforeUnmount(() => {
  generation++
  previewGen++
  io?.disconnect()
  io = null
})
</script>

<template>
  <div ref="rootEl" class="struct-cell" :class="{ 'struct-cell--empty': isEmpty }">
    <template v-if="isEmpty" />
    <IPopover
      v-else
      :open="popoverOpen"
      placement="right-start"
      :arrow="false"
      panel-class="struct-cell__popover"
      @update:open="popoverOpen = $event"
    >
      <template #anchor>
        <button
          type="button"
          class="struct-cell__trigger"
          :aria-label="error ? '结构式解析失败，点击查看原文' : '查看结构式与 SMILES'"
          :aria-expanded="popoverOpen"
          @click.stop="popoverOpen = !popoverOpen"
        >
          <div v-if="!inView || loading" class="struct-cell__skeleton" aria-hidden="true" />
          <div v-else-if="svgHtml" class="struct-cell__svg" v-html="svgHtml" />
          <IIcon v-else-if="error" name="warning" :size="18" class="struct-cell__warn" />
        </button>
      </template>
      <template #default>
        <div class="struct-cell__panel">
          <div v-if="previewLoading" class="struct-cell__preview-skel" aria-hidden="true" />
          <div v-else-if="previewSvg" class="struct-cell__preview" v-html="previewSvg" />
          <div v-else-if="error" class="struct-cell__preview-miss">
            <IIcon name="warning" :size="16" />
            <span>无法绘制结构</span>
          </div>
          <pre class="struct-cell__text">{{ value }}</pre>
          <p v-if="error" class="struct-cell__err">{{ error }}</p>
        </div>
      </template>
    </IPopover>
  </div>
</template>

<style scoped>
.struct-cell {
  display: flex;
  align-items: center;
}
.struct-cell--empty {
  min-height: 0;
}
.struct-cell__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--is-radius-sm);
  cursor: pointer;
  width: v-bind('thumbWidth + "px"');
  height: v-bind('thumbHeight + "px"');
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--is-border);
  box-sizing: border-box;
}
.struct-cell__trigger:hover {
  background: var(--is-surface-hover);
}
.struct-cell__skeleton {
  width: 100%;
  height: 100%;
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
  width: 100%;
  height: 100%;
  line-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.struct-cell__svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.struct-cell__warn {
  color: var(--is-warning, #d97706);
}
.struct-cell__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  max-width: min(360px, 80vw);
}
.struct-cell__preview,
.struct-cell__preview-skel {
  width: v-bind('STRUCTURE_PREVIEW_WIDTH + "px"');
  max-width: 100%;
  height: v-bind('STRUCTURE_PREVIEW_HEIGHT + "px"');
  background: #fff;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.struct-cell__preview-skel {
  background: linear-gradient(
    90deg,
    var(--is-surface-hover) 25%,
    var(--is-border) 50%,
    var(--is-surface-hover) 75%
  );
  background-size: 200% 100%;
  animation: struct-cell-shimmer 1.2s ease-in-out infinite;
}
.struct-cell__preview :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.struct-cell__preview-miss {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  font-size: var(--is-text-xs);
  color: var(--is-warning-text, #92400e);
}
.struct-cell__text {
  margin: 0;
  padding: 0;
  font-size: var(--is-text-xs);
  font-family: var(--is-font-mono, ui-monospace, monospace);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow: auto;
  color: var(--is-text-secondary);
}
.struct-cell__err {
  margin: 0;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
}
</style>

<style>
.struct-cell__popover {
  overflow: visible !important;
  max-width: none !important;
}
</style>
