<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Dashboard, DashboardWidget } from '../../shared/types'
import { IIcon } from '../../ui'
import { clampWidget, GRID_COLUMNS } from './grid'
import DashboardWidgetCard from './DashboardWidgetCard.vue'

const props = defineProps<{
  dashboard: Dashboard
  editLayout: boolean
}>()

const emit = defineEmits<{
  (e: 'update-widget', widgetId: string, patch: Partial<DashboardWidget>): void
  (e: 'remove-widget', widgetId: string): void
}>()

const layout = computed(() => props.dashboard.layout)
const rowHeight = computed(() => layout.value.rowHeight || 40)
const gap = computed(() => layout.value.gap || 8)

const canvasH = computed(() => {
  const max = props.dashboard.widgets.reduce((m, w) => Math.max(m, w.grid.y + w.grid.h), 8)
  const liveMax = Object.values(preview.value).reduce((m, g) => Math.max(m, g.y + g.h), max)
  return liveMax * rowHeight.value + (liveMax + 1) * gap.value + 48
})

type DragMode = 'move' | 'resize'
interface DragState {
  mode: DragMode
  id: string
  startX: number
  startY: number
  orig: DashboardWidget['grid']
  colW: number
  pointerId: number
}

const drag = ref<DragState | null>(null)
const preview = ref<Record<string, DashboardWidget['grid']>>({})
const canvasEl = ref<HTMLElement | null>(null)

function gridStyle(g: DashboardWidget['grid']) {
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

function effectiveGrid(w: DashboardWidget) {
  return preview.value[w.id] ?? w.grid
}

function onPointerDown(e: PointerEvent, w: DashboardWidget, mode: DragMode) {
  if (!props.editLayout) return
  const canvas = canvasEl.value
  if (!canvas) return
  e.preventDefault()
  e.stopPropagation()
  const rect = canvas.getBoundingClientRect()
  const colW = rect.width / GRID_COLUMNS
  drag.value = {
    mode,
    id: w.id,
    startX: e.clientX,
    startY: e.clientY,
    orig: { ...(preview.value[w.id] ?? w.grid) },
    colW,
    pointerId: e.pointerId,
  }
  preview.value = { ...preview.value, [w.id]: { ...(preview.value[w.id] ?? w.grid) } }
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
  let next =
    d.mode === 'move'
      ? { ...d.orig, x: d.orig.x + dxCols, y: d.orig.y + dyRows }
      : { ...d.orig, w: d.orig.w + dxCols, h: d.orig.h + dyRows }
  next = clampWidget(next, GRID_COLUMNS)
  preview.value = { ...preview.value, [d.id]: next }
}

function onPointerUp(e: PointerEvent) {
  const d = drag.value
  if (!d || (e.type !== 'pointercancel' && e.pointerId !== d.pointerId)) return
  const g = preview.value[d.id]
  if (g) emit('update-widget', d.id, { grid: g })
  drag.value = null
  preview.value = {}
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
    <div
      v-for="w in dashboard.widgets"
      :key="w.id"
      class="dc__item"
      :class="{
        'dc__item--edit': editLayout,
        'dc__item--dragging': drag?.id === w.id,
      }"
      :style="gridStyle(effectiveGrid(w))"
    >
      <!-- 编辑布局：整卡可拖，顶栏把手更明显 -->
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
.dc__item {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.dc__item--edit {
  outline: 1px dashed var(--is-border-strong, #98a2b3);
  outline-offset: -1px;
  border-radius: 8px;
  background: var(--is-surface);
}
.dc__item--dragging {
  z-index: 20;
  outline: 2px solid var(--is-accent, #3b82f6);
  box-shadow: 0 8px 24px rgb(16 24 40 / 18%);
  opacity: 0.96;
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
.dc__body--frozen {
  /* 内容不拦截；由 dc__move-layer 负责拖动 */
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
