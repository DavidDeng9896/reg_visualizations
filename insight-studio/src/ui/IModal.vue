<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import IIcon from './IIcon.vue'
import { FOCUSABLE_SELECTOR } from './utils'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** center = 居中弹窗；drawer = 右侧抽屉。 */
    variant?: 'center' | 'drawer'
    width?: number
    /** 点击遮罩关闭。 */
    closeOnOverlay?: boolean
  }>(),
  { variant: 'center', width: 480, closeOnOverlay: true },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'closed'): void }>()

const panelEl = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

function close() {
  emit('update:open', false)
  emit('closed')
}

function onOverlayClick() {
  if (props.closeOnOverlay) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab' || !panelEl.value) return
  // 焦点圈定
  const focusables = Array.from(panelEl.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || !panelEl.value.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      previousFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown, true)
      document.body.style.overflow = 'hidden'
      await nextTick()
      const first = panelEl.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(first ?? panelEl.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      document.body.style.overflow = ''
      previousFocus?.focus?.()
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition :name="variant === 'drawer' ? 'is-drawer' : 'is-modal'">
      <div
        v-if="open"
        class="is-modal__overlay"
        :class="{ 'is-modal__overlay--drawer': variant === 'drawer' }"
        role="presentation"
        @mousedown.self="onOverlayClick"
      >
        <div
          ref="panelEl"
          class="is-modal__panel"
          :class="[`is-modal__panel--${variant}`]"
          :style="variant === 'center' ? { width: `${width}px` } : { width: `${width}px` }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="is-modal__header">
            <slot name="header">
              <h3 class="is-modal__title">{{ title }}</h3>
            </slot>
            <button type="button" class="is-modal__close" aria-label="关闭" @click="close">
              <IIcon name="close" :size="14" />
            </button>
          </header>
          <div class="is-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="is-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.is-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--is-z-modal);
  background: rgba(16, 24, 40, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.is-modal__overlay--drawer {
  justify-content: flex-end;
  padding: 0;
}
.is-modal__panel {
  background: var(--is-surface);
  border-radius: var(--is-radius-lg);
  box-shadow: var(--is-shadow-lg);
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  outline: none;
}
.is-modal__panel--drawer {
  height: 100%;
  border-radius: 0;
}
.is-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--is-border);
}
.is-modal__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.is-modal__close {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.is-modal__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.is-modal__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.is-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--is-border);
}

/* 居中弹窗过渡 */
.is-modal-enter-active,
.is-modal-leave-active {
  transition: opacity var(--is-dur) var(--is-ease);
}
.is-modal-enter-active .is-modal__panel,
.is-modal-leave-active .is-modal__panel {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.is-modal-enter-from,
.is-modal-leave-to {
  opacity: 0;
}
.is-modal-enter-from .is-modal__panel,
.is-modal-leave-to .is-modal__panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* 抽屉过渡 */
.is-drawer-enter-active,
.is-drawer-leave-active {
  transition: opacity var(--is-dur) var(--is-ease);
}
.is-drawer-enter-active .is-modal__panel,
.is-drawer-leave-active .is-modal__panel {
  transition: transform var(--is-dur-slow) var(--is-ease);
}
.is-drawer-enter-from,
.is-drawer-leave-to {
  opacity: 0;
}
.is-drawer-enter-from .is-modal__panel,
.is-drawer-leave-to .is-modal__panel {
  transform: translateX(40px);
}
</style>
