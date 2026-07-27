<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Dashboard, DashboardWidget, DashboardWidgetGrid } from '../../shared/types'
import { IIcon } from '../../ui'
import {
  GRID_COLUMNS,
  type LayoutItem,
  moveWithPush,
  resizeWithPush,
  widgetsToLayout,
} from './grid'
import DashboardWidgetCard from './DashboardWidgetCard.vue'

const props = defineProps<{
  dashboard: Dashboard
  editLayout: boolean
}>()

const emit = defineEmits<{
  (e: 'update-widget', widgetId: string, patch: Partial<DashboardWidget>): void
  (e: 'apply-layout', layout: LayoutItem[]): void
  (e: 'remove-widget', widgetId: string): void
}>()

const layoutMeta = computed(() => props.dashboard.layout)
const rowHeight = computed(() => layoutMeta.value.rowHeight || 40)
const gap = computed(() => layoutMeta.value.gap || 8)

/** 拖拽过程中的全量预览布局（RGL：占位 + 挤压）。 */
const liveLayout = ref<LayoutItem[] | null>(null)
/** 拖拽目标格：占位块位置。 */
const placeholder = ref<DashboardWidgetGrid | null>(null)

const canvasH = computed(() => {
  const base = props.dashboard.widgets.reduce((m, w) => Math.max(m, w.grid.y + w.grid.h), 8)
  const live = liveLayout.value?.reduce((m, g) => Math.max(m, g.y + g.h), 0) ?? 0
  const max = Math.max(base, live, 8)
  return max * rowHeight.value + (max + 1) * gap.value + 48
})

type DragMode = 'move' | 'resize'
interface DragState {
  mode: DragMode
  id: string
  startX: number
  startY: number
  orig: DashboardWidgetGrid
  /** 拖开始时的完整布局快照。 */
  base: LayoutItem[]
  colW: number
  pointerId: number
}

const drag = ref<DragState | null>(null)
const canvasEl = ref<HTMLElement | null>(null)

function gridStyle(g: DashboardWidgetGrid) {
  const left = `calc(${(g.x / GRID_COLUMNS) * 100}% + ${gap.value / 2}px)`
  const width = `calc(${(g.w / GRID_COLUMNS) * 100}% - ${gap.value}px)`
  const top = g.y * rowHeight.value + gap.value
  const height = g.h * rowHeight.value - gap.value
  return {
    left,
    width,
    top: `${top}px`,
    height: `${Math.max(height, rowHeight.value)}px`,
  }
}

function effectiveGrid(w: DashboardWidget): DashboardWidgetGrid {
  const live = liveLayout.value?.find((l) => l.id === w.id)
  if (live) return { x: live.x, y: live.y, w: live.w, h: live.h }
  return w.grid
}

function onPointerDown(e: PointerEvent, w: DashboardWidget, mode: DragMode) {
  if (!props.editLayout) return
  const canvas = canvasEl.value
  if (!canvas) return
  e.preventDefault()
  e.stopPropagation()
  const rect = canvas.getBoundingClientRect()
  const colW = rect.width / GRID_COLUMNS
  const base = widgetsToLayout(props.dashboard.widgets)
  const orig = { ...w.grid }
  drag.value = {
    mode,
    id: w.id,
    startX: e.clientX,
    startY: e.clientY,
    orig,
    base,
    colW,
    pointerId: e.pointerId,
  }
  liveLayout.value = base.map((l) => ({ ...l }))
  placeholder.value = { ...orig }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  const dxCols = Math.round((e.clientX - d.startX) / d.colW)
  const dyRows = Math.round((e.clientY - d.startY) / rowHeight.value)

  let next: LayoutItem[]
  if (d.mode === 'move') {
    next = moveWithPush(d.base, d.id, d.orig.x + dxCols, d.orig.y + dyRows)
  } else {
    next = resizeWithPush(d.base, d.id, d.orig.w + dxCols, d.orig.h + dyRows)
  }
  liveLayout.value = next
  const active = next.find((l) => l.id === d.id)
  placeholder.value = active ? { x: active.x, y: active.y, w: active.w, h: active.h } : null
}

function onPointerUp(e: PointerEvent) {
  const d = drag.value
  if (!d || (e.type !== 'pointercancel' && e.pointerId !== d.pointerId)) return
  const finalLayout = liveLayout.value
  if (finalLayout) emit('apply-layout', finalLayout)
  drag.value = null
  liveLayout.value = null
  placeholder.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})
</script>

<template>
  <div ref="canvasEl" class="dc" :class="{ 'dc--edit': editLayout }" :style="{ height: `${canvasH}px` }">
    <!-- 占位：显示拖放落点，其它块已被挤压让位 -->
    <div
      v-if="editLayout && placeholder && drag"
      class="dc__placeholder"
      :style="gridStyle(placeholder)"
      aria-hidden="true"
    />

    <div
      v-for="w in dashboard.widgets"
      :key="w.id"
      class="dc__item"
      :class="{
        'dc__item--edit': editLayout,
        'dc__item--dragging': drag?.id === w.id,
        'dc__item--shifting': !!liveLayout && drag?.id !== w.id,
      }"
      :style="gridStyle(effectiveGrid(w))"
    >
      <div
        v-if="editLayout"
        class="dc__handle"
        title="拖动更改位置"
        @pointerdown="onPointerDown($event, w, 'move')"
      >
        <IIcon name="drag" :size="14" />
        <span class="dc__handle-label">拖动调整位置</span>
        <button
          type="button"
          class="dc__handle-del"
          title="移除组件"
          @pointerdown.stop
          @click.stop="emit('remove-widget', w.id)"
        >
          <IIcon name="trash" :size="13" />
        </button>
      </div>
      <div class="dc__body" :class="{ 'dc__body--frozen': editLayout }">
        <div
          v-if="editLayout"
          class="dc__move-layer"
          title="拖动更改位置"
          @pointerdown="onPointerDown($event, w, 'move')"
        />
        <DashboardWidgetCard
          class="dc__card"
          :widget="w"
          :edit-layout="editLayout"
          @remove="emit('remove-widget', w.id)"
        />
      </div>
      <div
        v-if="editLayout"
        class="dc__resize"
        title="拖动调整大小"
        @pointerdown="onPointerDown($event, w, 'resize')"
      />
    </div>
  </div>
</template>

<style scoped>
.dc {
  position: relative;
  width: 100%;
  min-height: 320px;
}
.dc--edit {
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--is-border) 55%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--is-border) 55%, transparent) 1px, transparent 1px);
  background-size: calc(100% / 12) 40px;
  background-position: 0 0;
  border-radius: 8px;
}
.dc__placeholder {
  position: absolute;
  box-sizing: border-box;
  border-radius: 8px;
  border: 2px dashed var(--is-accent, #3b82f6);
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 12%, transparent);
  pointer-events: none;
  z-index: 1;
}
.dc__item {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  transition:
    left 120ms ease,
    top 120ms ease,
    width 120ms ease,
    height 120ms ease;
}
.dc__item--edit {
  outline: 1px dashed var(--is-border-strong, #98a2b3);
  outline-offset: -1px;
  border-radius: 8px;
  background: var(--is-surface);
  z-index: 2;
}
.dc__item--shifting {
  z-index: 2;
}
.dc__item--dragging {
  z-index: 20;
  outline: 2px solid var(--is-accent, #3b82f6);
  box-shadow: 0 8px 24px rgb(16 24 40 / 18%);
  opacity: 0.92;
  transition: none;
}
.dc__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background: var(--is-surface-muted, #f2f4f7);
  border-bottom: 1px solid var(--is-border);
  border-radius: 8px 8px 0 0;
  color: var(--is-text-secondary);
  font-size: 11px;
  font-weight: 500;
  z-index: 3;
  position: relative;
}
.dc__handle-label {
  pointer-events: none;
}
.dc__handle-del {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--is-text-tertiary);
  display: inline-flex;
}
.dc__handle-del:hover {
  color: var(--is-danger);
  background: color-mix(in srgb, var(--is-danger) 12%, transparent);
}
.dc__handle:active {
  cursor: grabbing;
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 14%, var(--is-surface-muted, #f2f4f7));
}
.dc__body {
  flex: 1;
  min-height: 0;
  position: relative;
}
.dc__move-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: grab;
  touch-action: none;
}
.dc__move-layer:active {
  cursor: grabbing;
}
.dc__card {
  height: 100%;
}
.dc__resize {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  z-index: 4;
  cursor: nwse-resize;
  touch-action: none;
  border-radius: 2px;
  background: linear-gradient(135deg, transparent 45%, var(--is-border-strong, #98a2b3) 45%);
}
</style>
