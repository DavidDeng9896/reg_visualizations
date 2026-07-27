<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Dashboard, DashboardWidget } from '../../shared/types'
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
  return max * rowHeight.value + (max + 1) * gap.value + 24
})

type DragMode = 'move' | 'resize'
interface DragState {
  mode: DragMode
  id: string
  startX: number
  startY: number
  orig: DashboardWidget['grid']
  colW: number
}

const drag = ref<DragState | null>(null)
const preview = ref<Record<string, DashboardWidget['grid']>>({})

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
  const target = e.currentTarget as HTMLElement
  const canvas = target.closest('.dc') as HTMLElement | null
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
    orig: { ...w.grid },
    colW,
  }
  preview.value = { ...preview.value, [w.id]: { ...w.grid } }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  const dxCols = Math.round((e.clientX - d.startX) / d.colW)
  const dyRows = Math.round((e.clientY - d.startY) / rowHeight.value)
  let next =
    d.mode === 'move'
      ? { ...d.orig, x: d.orig.x + dxCols, y: d.orig.y + dyRows }
      : { ...d.orig, w: d.orig.w + dxCols, h: d.orig.h + dyRows }
  next = clampWidget(next, GRID_COLUMNS)
  preview.value = { ...preview.value, [d.id]: next }
}

function onPointerUp() {
  const d = drag.value
  if (d) {
    const g = preview.value[d.id]
    if (g) emit('update-widget', d.id, { grid: g })
  }
  drag.value = null
  preview.value = {}
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="dc" :style="{ height: `${canvasH}px` }">
    <div
      v-for="w in dashboard.widgets"
      :key="w.id"
      class="dc__item"
      :class="{ 'dc__item--edit': editLayout, 'dc__item--dragging': drag?.id === w.id }"
      :style="gridStyle(effectiveGrid(w))"
    >
      <div
        v-if="editLayout"
        class="dc__drag"
        title="拖动位置"
        @pointerdown="onPointerDown($event, w, 'move')"
      />
      <DashboardWidgetCard
        class="dc__card"
        :widget="w"
        :edit-layout="editLayout"
        @remove="emit('remove-widget', w.id)"
      />
      <div
        v-if="editLayout"
        class="dc__resize"
        title="调整大小"
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
.dc__item {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.dc__item--dragging {
  z-index: 5;
  opacity: 0.95;
}
.dc__card {
  flex: 1;
  min-height: 0;
}
.dc__drag {
  position: absolute;
  top: 0;
  left: 40px;
  right: 72px;
  height: 28px;
  z-index: 2;
  cursor: grab;
}
.dc__drag:active {
  cursor: grabbing;
}
.dc__resize {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 14px;
  height: 14px;
  z-index: 3;
  cursor: nwse-resize;
  border-radius: 2px;
  background: linear-gradient(135deg, transparent 50%, var(--is-border-strong, #98a2b3) 50%);
}
</style>
