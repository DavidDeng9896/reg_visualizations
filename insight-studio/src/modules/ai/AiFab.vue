<script setup lang="ts">
import { computed } from 'vue'
import { IIcon } from '../../ui'
import { useAiStore } from './aiStore'
import { storeToRefs } from 'pinia'

/** 右下角全局 AI 入口；停靠打开时隐藏，避免叠在窗角。 */
const ai = useAiStore()
const { drawerOpen } = storeToRefs(ai)

const visible = computed(() => {
  // docked 打开时隐藏；悬浮或关闭时显示（panelMode 由 drawer 同步到 store 或用 CSS 由父控制）
  return !(drawerOpen.value && ai.panelMode === 'docked')
})
</script>

<template>
  <button
    v-show="visible"
    type="button"
    class="ai-fab"
    data-testid="ai-fab"
    aria-label="打开 AI 助手"
    title="AI 助手"
    @click="ai.toggleDrawer()"
  >
    <IIcon name="sparkle" :size="22" />
  </button>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1250;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: var(--is-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--is-text-inverse, #fff);
  background: linear-gradient(135deg, var(--is-header-from, #1a5fb4) 0%, var(--is-header-to, #3584e4) 100%);
  box-shadow: var(--is-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2));
  transition: transform var(--is-dur-fast, 120ms) var(--is-ease, ease), box-shadow var(--is-dur-fast, 120ms) ease;
}
.ai-fab:hover {
  transform: scale(1.05);
}
.ai-fab:focus-visible {
  outline: 2px solid var(--is-accent, #3584e4);
  outline-offset: 3px;
}
</style>
