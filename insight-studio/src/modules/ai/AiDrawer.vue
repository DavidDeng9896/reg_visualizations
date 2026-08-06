<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { IIcon, toast } from '../../ui'
import { useAiStore, type TraceItem } from './aiStore'
import AiMessageList from './AiMessageList.vue'
import AiInputBar from './AiInputBar.vue'
import AiSettingsModal from './AiSettingsModal.vue'
import PendingActionsBar from './PendingActionsBar.vue'
import {
  clampFloating,
  dockedRect,
  HEADER_OFFSET,
  readLayout,
  shouldDock,
  writeLayout,
  type FloatingRect,
  type PanelMode,
} from './panelLayout'

/** AI 助手全局面板：可停靠右侧或拖出悬浮；会话历史 + 消息流 + 输入条。 */
const ai = useAiStore()
const { drawerOpen, settingsOpen, conversations, currentId, messages, running, switching } = storeToRefs(ai)
const historyOpen = ref(false)
const historyLoading = ref(false)
const deletingId = ref<string | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
let bodyRo: ResizeObserver | null = null

const mode = ref<PanelMode>('docked')
const floating = ref<FloatingRect>(dockedRect({ width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 }))
const dragging = ref(false)
let dragOffsetX = 0
let dragOffsetY = 0

function persist() {
  writeLayout({ mode: mode.value, floating: floating.value })
  ai.setPanelMode(mode.value)
}

function applyViewportClamp() {
  const vp = { width: window.innerWidth, height: window.innerHeight }
  if (mode.value === 'docked') {
    floating.value = dockedRect(vp, floating.value.w)
  } else {
    floating.value = clampFloating(floating.value, vp)
  }
}

function onResize() {
  applyViewportClamp()
  persist()
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && drawerOpen.value && !settingsOpen.value) {
    drawerOpen.value = false
  }
}

onMounted(() => {
  void ai.init()
  const saved = readLayout()
  mode.value = saved.mode
  floating.value = saved.floating
  applyViewportClamp()
  ai.setPanelMode(mode.value)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  bodyRo?.disconnect()
  bodyRo = null
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onEsc)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})

const panelStyle = computed(() => {
  if (mode.value === 'docked') {
    return {
      top: `${HEADER_OFFSET}px`,
      right: '0',
      left: 'auto',
      bottom: '0',
      width: `${floating.value.w}px`,
      maxHeight: 'none',
      height: 'auto',
      borderRadius: '0',
    } as Record<string, string>
  }
  const h = `min(720px, calc(100vh - ${floating.value.y + 8}px))`
  return {
    top: `${floating.value.y}px`,
    left: `${floating.value.x}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${floating.value.w}px`,
    height: h,
    maxHeight: h,
    borderRadius: 'var(--is-radius-md, 10px)',
  } as Record<string, string>
})

function onDragStart(e: PointerEvent) {
  const t = e.target as HTMLElement
  if (t.closest('button, a, input, textarea, [data-no-drag]')) return
  dragging.value = true
  if (mode.value === 'docked') {
    const vp = { width: window.innerWidth, height: window.innerHeight }
    floating.value = dockedRect(vp, floating.value.w)
    mode.value = 'floating'
    ai.setPanelMode('floating')
  }
  dragOffsetX = e.clientX - floating.value.x
  dragOffsetY = e.clientY - floating.value.y
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  e.preventDefault()
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  floating.value = clampFloating(
    { x: e.clientX - dragOffsetX, y: e.clientY - dragOffsetY, w: floating.value.w },
    { width: window.innerWidth, height: window.innerHeight },
  )
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  const vp = { width: window.innerWidth, height: window.innerHeight }
  if (shouldDock(floating.value, vp.width)) {
    mode.value = 'docked'
    floating.value = dockedRect(vp, floating.value.w)
    ai.setPanelMode('docked')
  } else {
    mode.value = 'floating'
    floating.value = clampFloating(floating.value, vp)
    ai.setPanelMode('floating')
  }
  persist()
}

function scrollBottom() {
  const el = bodyEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function scrollBottomSoon() {
  void nextTick(() => {
    scrollBottom()
    requestAnimationFrame(() => {
      scrollBottom()
      requestAnimationFrame(scrollBottom)
    })
  })
}

function ensureBodyResizeObserver() {
  const el = bodyEl.value
  if (!el) return
  bodyRo?.disconnect()
  bodyRo = new ResizeObserver(() => {
    if (stickToBottom.value) scrollBottom()
  })
  const child = el.firstElementChild
  bodyRo.observe(child ?? el)
}

function onBodyScroll() {
  const el = bodyEl.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

watch(drawerOpen, (open) => {
  if (!open) {
    historyOpen.value = false
    bodyRo?.disconnect()
    bodyRo = null
    return
  }
  stickToBottom.value = true
  scrollBottomSoon()
  void nextTick(ensureBodyResizeObserver)
})

watch(historyOpen, (open) => {
  if (!open) {
    stickToBottom.value = true
    scrollBottomSoon()
  }
})

watch(currentId, () => {
  stickToBottom.value = true
  scrollBottomSoon()
})

watch(
  messages,
  () => {
    if (stickToBottom.value) scrollBottomSoon()
  },
  { deep: true, flush: 'post' },
)

async function openHistory() {
  historyOpen.value = true
  historyLoading.value = true
  try {
    await ai.refreshConversations()
  } finally {
    historyLoading.value = false
  }
}

function closeHistory() {
  historyOpen.value = false
}

async function onSelectConversation(id: string) {
  if (!id || switching.value) return
  try {
    await ai.selectConversation(id)
    historyOpen.value = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '加载会话失败')
  }
}

async function onNewConversation() {
  if (switching.value) return
  historyOpen.value = false
  await ai.newConversation()
}

async function onRemoveConversation(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await ai.removeConversation(id)
  } finally {
    deletingId.value = null
  }
}

async function onConfirm(item: TraceItem): Promise<void> {
  await ai.decideTrace(item.id, 'confirm')
}

async function onReject(item: TraceItem): Promise<void> {
  await ai.decideTrace(item.id, 'reject')
}

function formatUpdatedAt(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  try {
    return new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const historyEmpty = computed(() => !historyLoading.value && !conversations.value.length)
</script>

<template>
  <Teleport to="body">
    <aside
      v-show="drawerOpen"
      class="ai-drawer"
      :class="{
        'ai-drawer--docked': mode === 'docked',
        'ai-drawer--floating': mode === 'floating',
        'ai-drawer--dragging': dragging,
        'ai-drawer--open': drawerOpen,
      }"
      :style="panelStyle"
      aria-label="AI 助手"
      data-testid="ai-drawer"
      :data-mode="mode"
    >
        <header class="ai-drawer__head ai-drawer__head--drag" @pointerdown="onDragStart">
          <div class="ai-drawer__title">
            <IIcon name="sparkle" :size="16" class="ai-drawer__logo" />
            <span>{{ historyOpen ? '会话历史' : 'AI 助手' }}</span>
          </div>
          <div class="ai-drawer__actions" data-no-drag>
            <button
              v-if="!historyOpen"
              type="button"
              class="ai-drawer__btn"
              title="会话历史"
              aria-label="会话历史"
              data-testid="ai-history"
              @click="openHistory"
            >
              <IIcon name="history" :size="15" />
            </button>
            <button
              v-else
              type="button"
              class="ai-drawer__btn"
              title="返回对话"
              aria-label="返回对话"
              @click="closeHistory"
            >
              <IIcon name="chevron-left" :size="15" />
            </button>
            <button
              type="button"
              class="ai-drawer__btn"
              title="新会话"
              aria-label="新会话"
              data-testid="ai-newconv"
              :disabled="switching"
              @click="onNewConversation"
            >
              <IIcon name="plus" :size="15" />
            </button>
            <button type="button" class="ai-drawer__btn" title="AI 设置" aria-label="AI 设置" data-testid="ai-settings" @click="settingsOpen = true">
              <IIcon name="gear" :size="15" />
            </button>
            <button type="button" class="ai-drawer__btn" title="关闭" aria-label="关闭" @click="drawerOpen = false">
              <IIcon name="close" :size="15" />
            </button>
          </div>
        </header>

        <div v-if="historyOpen" class="ai-drawer__history" data-testid="ai-history-panel" role="listbox" aria-label="会话历史列表">
          <div v-if="historyLoading" class="ai-drawer__loading" role="status">加载历史…</div>
          <div v-else-if="historyEmpty" class="ai-drawer__history-empty">
            <IIcon name="history" :size="28" class="ai-drawer__empty-icon" />
            <p>暂无历史会话</p>
            <p class="ai-drawer__hint">发送一条消息后会出现在这里，可随时回来继续。</p>
          </div>
          <template v-else>
            <div
              v-for="c in conversations"
              :key="c.id"
              class="ai-drawer__hist-item"
              :class="{ 'ai-drawer__hist-item--on': c.id === currentId }"
              role="option"
              tabindex="0"
              :aria-selected="c.id === currentId"
              :aria-disabled="switching || undefined"
              @click="!switching && onSelectConversation(c.id)"
              @keydown.enter="!switching && onSelectConversation(c.id)"
            >
              <div class="ai-drawer__hist-main">
                <span class="ai-drawer__hist-title is-ellipsis" :title="c.title">{{ c.title || '新会话' }}</span>
                <span class="ai-drawer__hist-time">{{ formatUpdatedAt(c.updatedAt) }}</span>
              </div>
              <button
                type="button"
                class="ai-drawer__hist-del"
                aria-label="删除会话"
                :disabled="!!deletingId || switching"
                :aria-busy="deletingId === c.id || undefined"
                @click.stop="onRemoveConversation(c.id)"
              >
                <IIcon v-if="deletingId === c.id" name="spinner" :size="12" class="ai-drawer__spin" />
                <IIcon v-else name="trash" :size="12" />
              </button>
            </div>
          </template>
        </div>

        <template v-else>
          <div ref="bodyEl" class="ai-drawer__body" @scroll.passive="onBodyScroll">
            <div v-if="switching" class="ai-drawer__loading" role="status">加载会话…</div>
            <template v-else>
              <div v-if="!messages.length" class="ai-drawer__empty">
                <IIcon name="sparkle" :size="28" class="ai-drawer__empty-icon" />
                <p>我是平台内置的分析助手，可以帮你建表、加工数据、配图表、做看板。</p>
                <p class="ai-drawer__hint">试试：「把当前表画成散点图并加线性拟合」</p>
              </div>
              <AiMessageList v-else :messages="messages" @confirm="onConfirm" @reject="onReject" @retry="ai.retry()" />
            </template>
            <div v-if="running" class="ai-drawer__running">正在生成…</div>
          </div>

          <PendingActionsBar @confirm="onConfirm" @reject="onReject" />
          <AiInputBar />
        </template>

        <AiSettingsModal :open="settingsOpen" @update:open="settingsOpen = $event" @saved="ai.init()" />
      </aside>
  </Teleport>
</template>

<style scoped>
.ai-drawer {
  position: fixed;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  background: var(--is-bg);
  border: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: var(--is-z-modal);
  overflow: hidden;
  /* 保持挂载，用可见性切换，避免二次打开重建整棵消息树 */
  pointer-events: none;
  opacity: 0;
  transform: translateX(8px);
  transition:
    opacity 120ms var(--is-ease, ease),
    transform 120ms var(--is-ease, ease);
}
.ai-drawer--open {
  pointer-events: auto;
  opacity: 1;
  transform: none;
}
.ai-drawer--docked {
  border-right: none;
  border-top: none;
  border-bottom: none;
}
.ai-drawer--floating {
  border-radius: var(--is-radius-md, 10px);
}
.ai-drawer--dragging {
  user-select: none;
  cursor: grabbing;
}
.ai-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ai-drawer__head--drag {
  cursor: grab;
}
.ai-drawer--dragging .ai-drawer__head--drag {
  cursor: grabbing;
}
.ai-drawer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--is-text-md);
  font-weight: 600;
}
.ai-drawer__logo {
  color: var(--is-accent);
}
.ai-drawer__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ai-drawer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.ai-drawer__btn:hover:not(:disabled) {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.ai-drawer__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ai-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.ai-drawer__empty {
  padding: 40px 28px;
  text-align: center;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  line-height: 1.8;
}
.ai-drawer__empty-icon {
  color: var(--is-accent);
  margin-bottom: 10px;
}
.ai-drawer__hint {
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}
.ai-drawer__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  padding: 40px 16px;
}
.ai-drawer__loading::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid var(--is-border-strong);
  border-top-color: var(--is-accent);
  border-radius: 50%;
  animation: ai-spin 0.7s linear infinite;
}
@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}
.ai-drawer__running {
  padding: 0 14px 8px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}

.ai-drawer__history {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
  background: var(--is-surface);
}
.ai-drawer__history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 28px;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  line-height: 1.7;
}
.ai-drawer__hist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--is-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--is-text);
}
.ai-drawer__hist-item:hover {
  background: var(--is-surface-hover);
}
.ai-drawer__hist-item--on {
  background: var(--is-accent-soft);
}
.ai-drawer__hist-item[aria-disabled='true'] {
  opacity: 0.6;
  cursor: wait;
  pointer-events: none;
}
.ai-drawer__hist-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-drawer__hist-title {
  font-size: var(--is-text-sm);
  font-weight: 500;
  line-height: 1.35;
}
.ai-drawer__hist-time {
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.ai-drawer__hist-del {
  border: none;
  background: transparent;
  color: var(--is-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  flex-shrink: 0;
}
.ai-drawer__hist-item:hover .ai-drawer__hist-del,
.ai-drawer__hist-del:focus-visible {
  opacity: 1;
}
.ai-drawer__hist-del:hover:not(:disabled) {
  color: var(--is-danger);
  background: color-mix(in srgb, var(--is-danger) 10%, transparent);
}
.ai-drawer__spin {
  animation: ai-spin 0.7s linear infinite;
}
</style>
