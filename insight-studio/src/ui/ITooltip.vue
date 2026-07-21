<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom'
    /** 悬停延迟（ms）。 */
    delay?: number
  }>(),
  { placement: 'top', delay: 300 },
)

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

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
    class="is-tooltip"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Transition name="is-tooltip-fade">
      <span
        v-if="visible && content"
        class="is-tooltip__bubble"
        :class="`is-tooltip__bubble--${placement}`"
        role="tooltip"
        >{{ content }}</span
      >
    </Transition>
  </span>
</template>

<style scoped>
.is-tooltip {
  position: relative;
  display: inline-flex;
}
.is-tooltip__bubble {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #1d2939;
  color: #fff;
  font-size: var(--is-text-xs);
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: var(--is-radius-sm);
  white-space: nowrap;
  max-width: 260px;
  z-index: var(--is-z-popover);
  pointer-events: none;
  box-shadow: var(--is-shadow-md);
}
.is-tooltip__bubble--top {
  bottom: calc(100% + 6px);
}
.is-tooltip__bubble--bottom {
  top: calc(100% + 6px);
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
