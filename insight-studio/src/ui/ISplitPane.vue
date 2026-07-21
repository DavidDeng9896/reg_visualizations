<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * 可拖拽分隔条的双栏面板。
 * direction: horizontal = 左右分栏（默认）；vertical = 上下分栏。
 * ratio = 第一栏占比 (0~1)；最小尺寸约束（px）；双击分隔条复位；storageKey 记住比例。
 */
const props = withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical'
    ratio?: number
    defaultRatio?: number
    /** 第一栏最小尺寸 px。 */
    minFirst?: number
    /** 第二栏最小尺寸 px。 */
    minSecond?: number
    storageKey?: string
    disabled?: boolean
  }>(),
  { direction: 'horizontal', defaultRatio: 0.5, minFirst: 120, minSecond: 120 },
)

const emit = defineEmits<{ (e: 'update:ratio', v: number): void }>()

const containerEl = ref<HTMLElement>()
const dragging = ref(false)

const innerRatio = ref(props.ratio ?? readStored() ?? props.defaultRatio)

function readStored(): number | null {
  if (!props.storageKey) return null
  try {
    const raw = localStorage.getItem(`is-splitpane:${props.storageKey}`)
    if (raw === null) return null
    const v = Number(raw)
    return Number.isFinite(v) && v > 0 && v < 1 ? v : null
  } catch {
    return null
  }
}

const currentRatio = computed(() => props.ratio ?? innerRatio.value)

function setRatio(v: number) {
  const clamped = Math.min(0.95, Math.max(0.05, v))
  if (props.ratio === undefined) innerRatio.value = clamped
  emit('update:ratio', clamped)
  if (props.storageKey) {
    try {
      localStorage.setItem(`is-splitpane:${props.storageKey}`, String(clamped))
    } catch {
      /* 忽略存储失败 */
    }
  }
}

watch(
  () => props.ratio,
  (v) => {
    if (v !== undefined) innerRatio.value = v
  },
)

function clampByMin(ratio: number): number {
  const el = containerEl.value
  if (!el) return ratio
  const total = props.direction === 'horizontal' ? el.clientWidth : el.clientHeight
  if (total <= 0) return ratio
  const minR = props.minFirst / total
  const maxR = 1 - props.minSecond / total
  return Math.min(maxR, Math.max(minR, ratio))
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return
  dragging.value = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || !containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const ratio =
    props.direction === 'horizontal'
      ? (e.clientX - rect.left) / rect.width
      : (e.clientY - rect.top) / rect.height
  setRatio(clampByMin(ratio))
}

function onPointerUp() {
  dragging.value = false
}

function onDblClick() {
  setRatio(clampByMin(props.defaultRatio))
}

function onKeydown(e: KeyboardEvent) {
  const step = 0.02
  const horizontalKeys = props.direction === 'horizontal'
  if ((horizontalKeys && e.key === 'ArrowLeft') || (!horizontalKeys && e.key === 'ArrowUp')) {
    e.preventDefault()
    setRatio(clampByMin(currentRatio.value - step))
  } else if ((horizontalKeys && e.key === 'ArrowRight') || (!horizontalKeys && e.key === 'ArrowDown')) {
    e.preventDefault()
    setRatio(clampByMin(currentRatio.value + step))
  }
}

onBeforeUnmount(() => {
  dragging.value = false
})
</script>

<template>
  <div
    ref="containerEl"
    class="is-split"
    :class="[`is-split--${direction}`, { 'is-split--dragging': dragging }]"
  >
    <div class="is-split__pane is-split__first" :style="{ flexBasis: `${currentRatio * 100}%` }">
      <slot name="first" />
    </div>
    <div
      class="is-split__divider"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(currentRatio * 100)"
      tabindex="0"
      title="拖拽调整，双击复位"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDblClick"
      @keydown="onKeydown"
    >
      <span class="is-split__handle" />
    </div>
    <div class="is-split__pane is-split__second">
      <slot name="second" />
    </div>
  </div>
</template>

<style scoped>
.is-split {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.is-split--horizontal {
  flex-direction: row;
}
.is-split--vertical {
  flex-direction: column;
}
.is-split__pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.is-split--horizontal .is-split__first {
  flex-shrink: 0;
}
.is-split--vertical .is-split__first {
  flex-shrink: 0;
}
.is-split__second {
  flex: 1;
}
.is-split__divider {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-border);
  transition: background-color var(--is-dur-fast) var(--is-ease);
  touch-action: none;
}
.is-split--horizontal .is-split__divider {
  width: 5px;
  cursor: col-resize;
}
.is-split--vertical .is-split__divider {
  height: 5px;
  cursor: row-resize;
}
.is-split__divider:hover,
.is-split--dragging .is-split__divider,
.is-split__divider:focus-visible {
  background: var(--is-accent);
}
.is-split--dragging {
  user-select: none;
}
.is-split__handle {
  border-radius: 2px;
  background: var(--is-text-tertiary);
}
.is-split--horizontal .is-split__handle {
  width: 3px;
  height: 24px;
}
.is-split--vertical .is-split__handle {
  width: 24px;
  height: 3px;
}
.is-split__divider:hover .is-split__handle,
.is-split--dragging .is-split__handle {
  background: #fff;
}
</style>
