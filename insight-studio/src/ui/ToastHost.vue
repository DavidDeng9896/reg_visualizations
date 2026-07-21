<script setup lang="ts">
import IIcon from './IIcon.vue'
import { toast, useToastItems, type ToastKind } from './toast'
import type { IconName } from './icons'

const items = useToastItems()

const KIND_ICON: Record<ToastKind, IconName> = {
  success: 'check',
  warning: 'warning',
  error: 'close',
  info: 'info',
}
</script>

<template>
  <div class="is-toast-host" role="region" aria-label="通知" aria-live="polite">
    <TransitionGroup name="is-toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="is-toast"
        :class="`is-toast--${item.kind}`"
        role="status"
      >
        <span class="is-toast__icon" aria-hidden="true">
          <IIcon :name="KIND_ICON[item.kind]" :size="13" />
        </span>
        <div class="is-toast__content">
          <div v-if="item.title" class="is-toast__title">{{ item.title }}</div>
          <div class="is-toast__message">
            {{ item.message }}<span v-if="item.count > 1" class="is-toast__count">×{{ item.count }}</span>
          </div>
        </div>
        <button type="button" class="is-toast__close" aria-label="关闭通知" @click="toast.dismiss(item.id)">
          <IIcon name="close" :size="12" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.is-toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: var(--is-z-toast);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 340px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}
.is-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.is-toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
}
.is-toast--success .is-toast__icon {
  background: var(--is-success);
}
.is-toast--warning .is-toast__icon {
  background: #e6a817;
}
.is-toast--error .is-toast__icon {
  background: var(--is-danger);
}
.is-toast--info .is-toast__icon {
  background: var(--is-info);
}
.is-toast__content {
  flex: 1;
  min-width: 0;
}
.is-toast__title {
  font-size: var(--is-text-sm);
  font-weight: 600;
}
.is-toast__message {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  word-break: break-word;
}
.is-toast__count {
  margin-left: 6px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-tertiary);
}
.is-toast__close {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.is-toast__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.is-toast-enter-active,
.is-toast-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.is-toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.is-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.is-toast-move {
  transition: transform var(--is-dur) var(--is-ease);
}
</style>
