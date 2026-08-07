<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { IIcon } from '../../ui'
import { useAiStore } from './aiStore'
import { storeToRefs } from 'pinia'

const FAB_POS_KEY = 'insight.ai.fab.v1'

/** 右下角全局 AI 入口；对话框打开时隐藏；支持拖拽定位。任务进行中时呼吸环 + 状态点。 */
const ai = useAiStore()
const { drawerOpen, running } = storeToRefs(ai)

const visible = computed(() => !drawerOpen.value)
/** 抽屉关闭且任务仍在跑 → 入口动效提示。 */
const busy = computed(() => visible.value && running.value)

const x = ref(0)
const y = ref(0)
const dragging = ref(false)
let dragMoved = false
let startPtrX = 0
let startPtrY = 0
let startX = 0
let startY = 0
const SIZE = 52
const MARGIN = 12

function clampPos(nx: number, ny: number): { x: number; y: number } {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN)
  return {
    x: Math.min(maxX, Math.max(MARGIN, nx)),
    y: Math.min(maxY, Math.max(MARGIN, ny)),
  }
}

function defaultPos(): { x: number; y: number } {
  return clampPos(window.innerWidth - SIZE - 24, window.innerHeight - SIZE - 24)
}

function loadPos(): void {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY)
    if (raw) {
      const j = JSON.parse(raw) as { x?: number; y?: number }
      if (typeof j.x === 'number' && typeof j.y === 'number') {
        const c = clampPos(j.x, j.y)
        x.value = c.x
        y.value = c.y
        return
      }
    }
  } catch {
    /* ignore */
  }
  const d = defaultPos()
  x.value = d.x
  y.value = d.y
}

function savePos(): void {
  try {
    localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x: x.value, y: y.value }))
  } catch {
    /* ignore */
  }
}

function onResize(): void {
  const c = clampPos(x.value, y.value)
  x.value = c.x
  y.value = c.y
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  dragging.value = true
  dragMoved = false
  startPtrX = e.clientX
  startPtrY = e.clientY
  startX = x.value
  startY = y.value
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  const dx = e.clientX - startPtrX
  const dy = e.clientY - startPtrY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true
  const c = clampPos(startX + dx, startY + dy)
  x.value = c.x
  y.value = c.y
}

function onPointerUp(): void {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (dragMoved) {
    savePos()
    return
  }
  ai.toggleDrawer()
}

onMounted(() => {
  loadPos()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <button
    v-show="visible"
    type="button"
    class="ai-fab"
    :class="{ 'ai-fab--dragging': dragging, 'ai-fab--busy': busy }"
    data-testid="ai-fab"
    :data-busy="busy || undefined"
    :aria-label="busy ? 'AI 助手 · 任务进行中' : '打开 AI 助手'"
    :title="busy ? 'AI 助手 · 任务进行中（可拖拽）' : 'AI 助手（可拖拽）'"
    :style="{ left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' }"
    @pointerdown="onPointerDown"
  >
    <span v-if="busy" class="ai-fab__ring" aria-hidden="true" />
    <span v-if="busy" class="ai-fab__dot" aria-hidden="true" />
    <IIcon name="sparkle" :size="22" class="ai-fab__icon" />
  </button>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  z-index: 1250;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: var(--is-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  color: var(--is-text-inverse, #fff);
  background: linear-gradient(135deg, var(--is-header-from, #1a5fb4) 0%, var(--is-header-to, #3584e4) 100%);
  box-shadow: var(--is-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2));
  transition: transform var(--is-dur-fast, 120ms) var(--is-ease, ease), box-shadow var(--is-dur-fast, 120ms) ease;
  user-select: none;
}
.ai-fab:hover {
  transform: scale(1.05);
}
.ai-fab--dragging {
  cursor: grabbing;
  transform: scale(1.06);
  transition: none;
}
.ai-fab:focus-visible {
  outline: 2px solid var(--is-accent, #3584e4);
  outline-offset: 3px;
}

/* 进行中：呼吸环 + 右上角状态点；图标轻微闪动 */
.ai-fab--busy {
  box-shadow:
    var(--is-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2)),
    0 0 0 0 color-mix(in srgb, var(--is-accent, #3584e4) 45%, transparent);
  animation: ai-fab-breathe 1.6s ease-in-out infinite;
}
.ai-fab__ring {
  position: absolute;
  inset: -5px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, #fff 75%, var(--is-accent, #3584e4));
  border-top-color: transparent;
  border-left-color: color-mix(in srgb, #fff 35%, transparent);
  animation: ai-fab-spin 1.35s linear infinite;
  pointer-events: none;
}
.ai-fab__dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--is-header-from, #1a5fb4) 80%, transparent);
  animation: ai-fab-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}
.ai-fab__icon {
  position: relative;
  z-index: 1;
}
.ai-fab--busy .ai-fab__icon {
  animation: ai-fab-icon 1.6s ease-in-out infinite;
}
@keyframes ai-fab-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes ai-fab-breathe {
  0%,
  100% {
    box-shadow:
      var(--is-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2)),
      0 0 0 0 color-mix(in srgb, var(--is-accent, #3584e4) 40%, transparent);
  }
  50% {
    box-shadow:
      var(--is-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2)),
      0 0 0 8px color-mix(in srgb, var(--is-accent, #3584e4) 0%, transparent);
  }
}
@keyframes ai-fab-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.85);
  }
}
@keyframes ai-fab-icon {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.82;
  }
}
</style>
