<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useFloatingPanel } from './floating'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom'
    /** 悬停延迟（ms）。 */
    delay?: number
  }>(),
  { placement: 'top', delay: 300 },
)

const rootEl = ref<HTMLElement>()
const bubbleEl = ref<HTMLElement>()
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const { style: bubbleStyle } = useFloatingPanel(
  visible,
  rootEl,
  bubbleEl,
  computed(() => props.placement),
  { zIndex: 'var(--is-z-popover)' },
)

function show() {
  clearTimeout(timer)
  timer = setTimeout(() => (visible.value = true), props.delay)
}
function hide() {
  clearTimeout(timer)
  visible.value = false
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span
    ref="rootEl"
    class="is-tooltip"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Teleport to="body">
      <Transition name="is-tooltip-fade">
        <span
          v-if="visible && content"
          ref="bubbleEl"
          class="is-tooltip__bubble"
          :class="`is-tooltip__bubble--${placement}`"
          :style="bubbleStyle"
          data-is-floating="1"
          role="tooltip"
          >{{ content }}</span
        >
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.is-tooltip {
  position: relative;
  display: inline-flex;
}
.is-tooltip__bubble {
  /* position/top/left from teleported fixed style */
  background: #1d2939;
  color: #fff;
  font-size: var(--is-text-xs);
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: var(--is-radius-sm);
  white-space: nowrap;
  max-width: 260px;
  pointer-events: none;
  box-shadow: var(--is-shadow-md);
}
.is-tooltip-fade-enter-active,
.is-tooltip-fade-leave-active {
  transition: opacity var(--is-dur-fast) var(--is-ease);
}
.is-tooltip-fade-enter-from,
.is-tooltip-fade-leave-to {
  opacity: 0;
}
</style>
