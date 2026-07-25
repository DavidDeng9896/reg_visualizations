</template>

<style scoped>
.is-select {
  position: relative;
  display: inline-block;
  min-width: 0;
}
.is-select__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  font-size: var(--is-text-sm);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.is-select--md .is-select__trigger {
  height: 32px;
}
.is-select--sm .is-select__trigger {
  height: 28px;
  font-size: var(--is-text-xs);
}
/* ghost：无框文字下拉，仅 hover 浅灰底 */
.is-select--ghost .is-select__trigger {
  border-color: transparent;
  background: transparent;
  padding: 0 6px;
  font-weight: 500;
  width: auto;
}
.is-select--ghost .is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--ghost.is-select--open .is-select__trigger,
.is-select--ghost .is-select__trigger:focus-visible {
  border-color: transparent;
  box-shadow: none;
  background: var(--is-surface-hover);
}
.is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--open .is-select__trigger,
.is-select__trigger:focus-visible {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.is-select__trigger-icon {
  color: var(--is-text-secondary);
}
.is-select__value {
  flex: 1;
  text-align: left;
}
.is-select__value--placeholder {
  color: var(--is-text-tertiary);
}
.is-select__chevron {
  color: var(--is-text-tertiary);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-select--open .is-select__chevron {
  transform: rotate(180deg);
}

.is-select__panel {
  /* position/top/left from teleported fixed style */
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}
.is-select__search {
  padding: 6px;
  border-bottom: 1px solid var(--is-border);
}
.is-select__search-input {
  width: 100%;
  height: 26px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-size: var(--is-text-xs);
  outline: none;
}
.is-select__search-input:focus {
  border-color: var(--is-accent);
}
.is-select__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.is-select__group {
  padding: 6px 8px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.is-select__option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.is-select__option--active {
  background: var(--is-accent-soft);
}
.is-select__option--selected {
  color: var(--is-accent);
  font-weight: 500;
}
.is-select__option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-select__check {
  margin-left: auto;
}
.is-select__empty {
  padding: 12px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}

.is-select-panel-enter-active,
.is-select-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
  transform-origin: top left;
}
.is-select-panel-enter-from,
.is-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
```

=== FILE: src/ui/IModal.vue (from line 1) ===
```
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
```

=== FILE: src/ui/IEmptyState.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

/** 空态：插画位 + 标题 + 描述 + CTA。 */
withDefaults(
  defineProps<{
    icon?: IconName
    title: string
    description?: string
  }>(),
  { icon: 'database' },
)
</script>

<template>
  <div class="is-empty">
    <div class="is-empty__art" aria-hidden="true">
      <slot name="illustration">
        <IIcon :name="icon" :size="36" />
      </slot>
    </div>
    <h3 class="is-empty__title">{{ title }}</h3>
    <p v-if="description" class="is-empty__desc">{{ description }}</p>
    <div v-if="$slots.default" class="is-empty__cta">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 8px;
}
.is-empty__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--is-accent-soft);
  color: var(--is-accent);
  margin-bottom: 8px;
}
.is-empty__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.is-empty__desc {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  max-width: 360px;
}
.is-empty__cta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
```

=== FILE: src/ui/IBadge.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'yellow' | 'red'

/** 过滤/转换 chip 与小徽标。 */
withDefaults(
  defineProps<{
    tone?: BadgeTone
    icon?: IconName
    removable?: boolean
    clickable?: boolean
  }>(),
  { tone: 'gray' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-badge"
    :class="[`is-badge--${tone}`, { 'is-badge--clickable': clickable }]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('click')"
    @keydown.enter="clickable && emit('click')"
  >
    <IIcon v-if="icon" :name="icon" :size="12" />
    <span class="is-ellipsis"><slot /></span>
    <button
      v-if="removable"
      type="button"
      class="is-badge__remove"
      aria-label="移除"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="10" />
    </button>
  </span>
</template>

<style scoped>
.is-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  font-size: var(--is-text-xs);
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-badge--gray {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  border-color: var(--is-border);
}
.is-badge--blue {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  border-color: #d3dfff;
}
.is-badge--green {
  background: var(--is-success-soft);
  color: var(--is-success);
  border-color: #cdeede;
}
.is-badge--yellow {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  border-color: #f3e3b3;
}
.is-badge--red {
  background: var(--is-danger-soft);
  color: var(--is-danger);
  border-color: #f6d2ce;
}
.is-badge--clickable {
  cursor: pointer;
}
.is-badge--clickable:hover {
  filter: brightness(0.96);
}
.is-badge__remove {
  display: inline-flex;
  padding: 1px;
  border-radius: 50%;
  color: inherit;
  opacity: 0.7;
}
.is-badge__remove:hover {
  opacity: 1;
  background: rgba(16, 24, 40, 0.1);
}
</style>
```

=== FILE: src/ui/IIcon.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const def = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="is-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <text
      v-if="def.kind === 'text'"
      x="12"
      y="16.5"
      text-anchor="middle"
      fill="currentColor"
      :font-size="name === 'type-number' ? 15 : 12"
      font-weight="600"
      font-family="var(--is-font)"
      >{{ def.text }}</text
    >
    <g
      v-else-if="def.kind === 'stroke'"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="def.content"
    />
    <g v-else fill="currentColor" v-html="def.content" />
  </svg>
</template>

<style scoped>
.is-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
```
