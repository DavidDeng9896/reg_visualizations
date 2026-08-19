<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Dashboard, DashboardWidget, DashboardWidgetGrid } from '../../shared/types'
import { IButton, IIcon, IModal } from '../../ui'
import {
  GRID_COLUMNS,
  type LayoutItem,
  finalizeLayout,
  layoutsEqual,
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
  /** 多选批量删除。 */
  (e: 'remove-widgets', widgetIds: string[]): void
}>()

const layoutMeta = computed(() => props.dashboard.layout)
const rowHeight = computed(() => layoutMeta.value.rowHeight || 40)
const gap = computed(() => layoutMeta.value.gap || 8)

/** 拖拽过程中的全量预览布局。 */
const liveLayout = ref<LayoutItem[] | null>(null)
/** 落点占位（钉住的活动块格子）。 */
const placeholder = ref<DashboardWidgetGrid | null>(null)
/** 指针像素偏移，拖中的卡片跟手，避免和占位/邻居抢位置。 */
const dragPixel = ref<{ dx: number; dy: number } | null>(null)

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
  base: LayoutItem[]
  colW: number
  pointerId: number
  lastDx: number
  lastDy: number
}

const drag = ref<DragState | null>(null)
const canvasEl = ref<HTMLElement | null>(null)
let raf = 0
let pendingEvt: PointerEvent | null = null

function gridStyle(g: DashboardWidgetGrid, extra?: Record<string, string>) {
  const left = `calc(${(g.x / GRID_COLUMNS) * 100}% + ${gap.value / 2}px)`
  const width = `calc(${(g.w / GRID_COLUMNS) * 100}% - ${gap.value}px)`
  const top = g.y * rowHeight.value + gap.value
  const height = g.h * rowHeight.value - gap.value
  return {
    left,
    width,
    top: `${top}px`,
    height: `${Math.max(height, rowHeight.value)}px`,
    ...extra,
  }
}

function effectiveGrid(w: DashboardWidget): DashboardWidgetGrid {
  const live = liveLayout.value?.find((l) => l.id === w.id)
  if (live) return { x: live.x, y: live.y, w: live.w, h: live.h }
  return w.grid
}

function itemStyle(w: DashboardWidget) {
  const g = effectiveGrid(w)
  const isDragging = drag.value?.id === w.id && drag.value.mode === 'move' && dragPixel.value
  if (isDragging && dragPixel.value) {
    // 跟手：从原始格子出发加像素偏移；占位块单独显示落点
    const orig = drag.value!.orig
    return gridStyle(orig, {
      transform: `translate(${dragPixel.value.dx}px, ${dragPixel.value.dy}px)`,
      zIndex: '30',
      transition: 'none',
      willChange: 'transform',
    })
  }
  return gridStyle(g)
}

function applyDragLayout(d: DragState, clientX: number, clientY: number) {
  const dxPx = clientX - d.startX
  const dyPx = clientY - d.startY
  const dxCols = Math.round(dxPx / d.colW)
  const dyRows = Math.round(dyPx / rowHeight.value)

  if (d.mode === 'move') {
    dragPixel.value = { dx: dxPx, dy: dyPx }
    // 格子未变则跳过重算，减卡顿
    if (dxCols === d.lastDx && dyRows === d.lastDy && liveLayout.value) return
    d.lastDx = dxCols
    d.lastDy = dyRows
    const next = moveWithPush(d.base, d.id, d.orig.x + dxCols, d.orig.y + dyRows, GRID_COLUMNS, {
      pinMover: true,
    })
    liveLayout.value = next
    const active = next.find((l) => l.id === d.id)
    placeholder.value = active ? { x: active.x, y: active.y, w: active.w, h: active.h } : null
    return
  }

  dragPixel.value = null
  if (dxCols === d.lastDx && dyRows === d.lastDy && liveLayout.value) return
  d.lastDx = dxCols
  d.lastDy = dyRows
  const next = resizeWithPush(d.base, d.id, d.orig.w + dxCols, d.orig.h + dyRows, GRID_COLUMNS, {
    pinMover: true,
  })
  liveLayout.value = next
  const active = next.find((l) => l.id === d.id)
  placeholder.value = active ? { x: active.x, y: active.y, w: active.w, h: active.h } : null
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
    lastDx: 0,
    lastDy: 0,
  }
  liveLayout.value = base.map((l) => ({ ...l }))
  placeholder.value = { ...orig }
  dragPixel.value = mode === 'move' ? { dx: 0, dy: 0 } : null
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onDragKeydown)
}

/** 拖拽期 body 标记：ChartPanel 的 RO resize 据此挂起，松手后一次性 resize。 */
watch(drag, (d) => {
  document.body.classList.toggle('is-board-dragging', !!d)
})

function onDragKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  cancelDrag()
}

/** Esc 取消拖拽：还原布局，不落盘。 */
function cancelDrag() {
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  pendingEvt = null
  drag.value = null
  liveLayout.value = null
  placeholder.value = null
  dragPixel.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('keydown', onDragKeydown)
}

/* 键盘拖拽：手柄聚焦后方向键移动，Shift+方向键调整大小（步进 1 格），Delete 移除组件 */
function onHandleKeydown(e: KeyboardEvent, w: DashboardWidget, mode: DragMode) {
  const step: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    emit('remove-widget', w.id)
    return
  }
  const d = step[e.key]
  if (!d) return
  e.preventDefault()
  e.stopPropagation()
  const base = widgetsToLayout(props.dashboard.widgets)
  const g = w.grid
  const next =
    mode === 'move'
      ? moveWithPush(base, w.id, g.x + d[0], g.y + d[1], GRID_COLUMNS, { pinMover: true })
      : resizeWithPush(base, w.id, g.w + d[0], g.h + d[1], GRID_COLUMNS, { pinMover: true })
  const final = finalizeLayout(next)
  if (!layoutsEqual(base, final)) emit('apply-layout', final)
}

function onPointerMove(e: PointerEvent) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  pendingEvt = e
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const ev = pendingEvt
    pendingEvt = null
    const cur = drag.value
    if (!ev || !cur) return
    applyDragLayout(cur, ev.clientX, ev.clientY)
  })
}

function onPointerUp(e: PointerEvent) {
  const d = drag.value
  if (!d || (e.type !== 'pointercancel' && e.pointerId !== d.pointerId)) return
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  // 用最终指针再算一次，避免 rAF 丢最后一帧
  applyDragLayout(d, e.clientX, e.clientY)

  const raw = liveLayout.value
  if (raw) {
    const final = finalizeLayout(raw)
    if (!layoutsEqual(d.base, final)) emit('apply-layout', final)
  }
  drag.value = null
  liveLayout.value = null
  placeholder.value = null
  dragPixel.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('keydown', onDragKeydown)
}

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  document.body.classList.remove('is-board-dragging')
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('keydown', onDragKeydown)
  unbindSelectionKeys()
})

/* ------------------------------- 组件多选 ------------------------------- */

/** 已选组件 id 集（看板/编辑模式均可用）。 */
const selected = ref<Set<string>>(new Set())
const anySelected = computed(() => selected.value.size > 0)
const confirmDelOpen = ref(false)

function toggleSelect(id: string): void {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}
function clearSelection(): void {
  selected.value = new Set()
}

/** 看板切换 / 组件被移除时同步选择集。 */
watch(
  () => [props.dashboard.id, props.dashboard.widgets.length] as const,
  () => {
    const alive = new Set(props.dashboard.widgets.map((w) => w.id)
    )
    const next = new Set([...selected.value].filter((id) => alive.has(id)))
    if (next.size !== selected.value.size) selected.value = next
  },
)

function askBatchDelete(): void {
  if (selected.value.size) confirmDelOpen.value = true
}
function confirmBatchDelete(): void {
  confirmDelOpen.value = false
  if (selected.value.size) emit('remove-widgets', [...selected.value])
  clearSelection()
}

/** 键盘批量移动：方向键将所选组件整体平移 1 格（按序挤压，尽量保持相对位置）。 */
function moveSelected(dx: number, dy: number): void {
  if (!selected.value.size) return
  let base = widgetsToLayout(props.dashboard.widgets)
  for (const id of selected.value) {
    const cur = base.find((l) => l.id === id)
    if (!cur) continue
    base = moveWithPush(base, id, cur.x + dx, cur.y + dy, GRID_COLUMNS, { pinMover: true })
  }
  const final = finalizeLayout(base)
  if (!layoutsEqual(widgetsToLayout(props.dashboard.widgets), final)) emit('apply-layout', final)
}

const ARROW_STEP: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

function onSelectionKeydown(e: KeyboardEvent): void {
  if (!anySelected.value) return
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
  if (e.key === 'Escape') {
    e.preventDefault()
    clearSelection()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    askBatchDelete()
    return
  }
  const step = ARROW_STEP[e.key]
  if (step) {
    e.preventDefault()
    moveSelected(step[0], step[1])
  }
}

function bindSelectionKeys(): void {
  document.addEventListener('keydown', onSelectionKeydown)
}
function unbindSelectionKeys(): void {
  document.removeEventListener('keydown', onSelectionKeydown)
}
watch(anySelected, (on) => {
  if (on) bindSelectionKeys()
  else unbindSelectionKeys()
})
</script>

<template>
  <div class="dc-wrap">
    <!-- 多选操作条：选中组件后显示在画布上方（内联，不遮挡组件） -->
    <Transition name="dc-bar">
      <div v-if="anySelected" class="dc__actionbar" role="toolbar" aria-label="批量操作">
        <span class="dc__actionbar-count" title="方向键平移所选组件；Delete 批量删除；Esc 取消选择">已选 {{ selected.size }} 个组件</span>
        <IButton size="sm" variant="danger" icon="trash" @click="askBatchDelete">批量删除</IButton>
        <IButton size="sm" variant="ghost" icon="close" aria-label="取消选择" @click="clearSelection" />
      </div>
    </Transition>

    <div
      ref="canvasEl"
      class="dc"
      :class="{ 'dc--edit': editLayout, 'dc--dragging': !!drag }"
      :style="{ height: `${canvasH}px` }"
    >
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
      :data-widget-id="w.id"
      :class="{
        'dc__item--edit': editLayout,
        'dc__item--dragging': drag?.id === w.id,
        'dc__item--ghost': drag?.id === w.id && drag.mode === 'move',
        'dc__item--selected': selected.has(w.id),
      }"
      :style="itemStyle(w)"
    >
      <!-- 多选勾选框（hover 或已有选择时显示） -->
      <button
        type="button"
        class="dc__check"
        :class="{ 'dc__check--on': selected.has(w.id), 'dc__check--show': anySelected }"
        :aria-pressed="selected.has(w.id)"
        :aria-label="selected.has(w.id) ? '取消选择组件' : '选择组件'"
        :title="selected.has(w.id) ? '取消选择' : '选择组件'"
        @click.stop="toggleSelect(w.id)"
        @pointerdown.stop
      >
        <IIcon name="check" :size="11" />
      </button>
      <div
        v-if="editLayout"
        class="dc__handle"
        title="拖动更改位置（聚焦后可用方向键移动，Delete 移除）"
        role="button"
        tabindex="0"
        aria-label="拖动调整位置"
        :aria-grabbed="drag?.id === w.id"
        @pointerdown="onPointerDown($event, w, 'move')"
        @keydown="onHandleKeydown($event, w, 'move')"
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
        title="拖动调整大小（聚焦后可用方向键调整）"
        role="button"
        tabindex="0"
        aria-label="拖动调整大小"
        @pointerdown="onPointerDown($event, w, 'resize')"
        @keydown="onHandleKeydown($event, w, 'resize')"
      />
    </div>

    <!-- 批量删除确认 -->
    <IModal :open="confirmDelOpen" title="批量删除组件" :width="420" @update:open="confirmDelOpen = $event">
      <p class="dc__confirm-text">确定删除选中的 {{ selected.size }} 个组件吗？此操作不可撤销。</p>
      <template #footer>
        <IButton @click="confirmDelOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmBatchDelete">删除</IButton>
      </template>
    </IModal>
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
.dc--dragging {
  user-select: none;
  cursor: grabbing;
}
.dc--dragging .dc__item {
  /* 拖拽中关掉位移动画，避免卡顿和「乱动」感 */
  transition: none !important;
}
.dc__placeholder {
  position: absolute;
  box-sizing: border-box;
  border-radius: 8px;
  border: 2px dashed var(--is-accent, #3b82f6);
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 14%, transparent);
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
    left 160ms ease,
    top 160ms ease,
    width 160ms ease,
    height 160ms ease;
  animation: dc-item-in 160ms var(--is-ease);
}
@keyframes dc-item-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.dc__item--edit {
  outline: 1px dashed var(--is-border-strong, #98a2b3);
  outline-offset: -1px;
  border-radius: 8px;
  background: var(--is-surface);
  z-index: 2;
}
.dc__item--dragging {
  z-index: 30;
  outline: 2px solid var(--is-accent, #3b82f6);
  box-shadow: 0 12px 28px rgb(16 24 40 / 20%);
  pointer-events: none;
}
.dc__item--ghost {
  opacity: 0.88;
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
  pointer-events: auto;
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
  right: 0;
  bottom: 0;
  width: 24px;
  height: 24px;
  z-index: 4;
  cursor: nwse-resize;
  touch-action: none;
  border-radius: 2px;
  background: linear-gradient(135deg, transparent 45%, var(--is-border-strong, #98a2b3) 45%);
  background-size: 16px 16px;
  background-position: bottom right;
  background-repeat: no-repeat;
}
.dc__handle:focus-visible,
.dc__resize:focus-visible {
  outline: none;
  box-shadow: var(--is-ring-sm);
}
.dc__handle:focus-visible {
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 14%, var(--is-surface-muted, #f2f4f7));
}
.dc__move-layer:hover {
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 6%, transparent);
}
.dc--dragging .dc__resize {
  pointer-events: none;
}

/* ---- 多选 ---- */
.dc__check {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-full);
  background: var(--is-surface);
  color: transparent;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    background var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.dc__item:hover .dc__check,
.dc__check--show,
.dc__check:focus-visible {
  opacity: 1;
}
.dc__check:hover {
  border-color: var(--is-accent);
  color: var(--is-accent);
}
.dc__check--on {
  opacity: 1;
  background: var(--is-accent);
  border-color: var(--is-accent);
  color: #fff;
}
.dc__item--selected {
  outline: 2px solid var(--is-accent);
  outline-offset: -1px;
  border-radius: 8px;
}
.dc__actionbar {
  position: relative;
  margin: 0 0 12px;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-full);
  background: var(--is-surface);
  box-shadow: var(--is-shadow-sm);
  z-index: 1;
}
.dc__actionbar-count {
  font-size: var(--is-text-sm);
  color: var(--is-text);
  font-weight: 500;
  padding: 0 4px;
}
.dc-bar-enter-active,
.dc-bar-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
}
.dc-bar-enter-from,
.dc-bar-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.dc__confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
