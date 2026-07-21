<script setup lang="ts">
import { ref } from 'vue'
import { useClickOutside, useEscape } from './utils'

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'right-start'

const props = withDefaults(
  defineProps<{
    open: boolean
    placement?: PopoverPlacement
    /** 显示小箭头。 */
    arrow?: boolean
    /** 点击外部是否关闭。 */
    closeOnOutside?: boolean
    panelClass?: string
  }>(),
  { placement: 'bottom-start', arrow: true, closeOnOutside: true },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const rootEl = ref<HTMLElement>()

function close() {
  emit('update:open', false)
}

useClickOutside([rootEl], () => {
  if (props.closeOnOutside) close()
})
useEscape(close, () => props.open)

defineExpose({ close })
</script>

<template>
  <div ref="rootEl" class="is-popover">
    <div class="is-popover__anchor" @click.stop>
      <slot name="anchor" :open="open" :close="close" />
    </div>
    <Transition name="is-popover-panel">
      <div
        v-if="open"
        class="is-popover__panel"
        :class="[`is-popover__panel--${placement}`, panelClass]"
        role="dialog"
        @click.stop
      >
        <span v-if="arrow" class="is-popover__arrow" aria-hidden="true" />
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.is-popover {
  position: relative;
  display: inline-block;
}
.is-popover__panel {
  position: absolute;
  z-index: var(--is-z-popover);
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  min-width: 160px;
}
.is-popover__panel--bottom-start {
  top: calc(100% + 8px);
  left: 0;
}
.is-popover__panel--bottom-end {
  top: calc(100% + 8px);
  right: 0;
}
.is-popover__panel--top-start {
  bottom: calc(100% + 8px);
  left: 0;
}
.is-popover__panel--right-start {
  left: calc(100% + 8px);
  top: 0;
}

.is-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  transform: rotate(45deg);
}
.is-popover__panel--bottom-start .is-popover__arrow,
.is-popover__panel--bottom-end .is-popover__arrow {
  top: -6px;
  border-right: none;
  border-bottom: none;
}
.is-popover__panel--bottom-start .is-popover__arrow {
  left: 14px;
}
.is-popover__panel--bottom-end .is-popover__arrow {
  right: 14px;
}
.is-popover__panel--top-start .is-popover__arrow {
  bottom: -6px;
  left: 14px;
  border-left: none;
  border-top: none;
}
.is-popover__panel--right-start .is-popover__arrow {
  left: -6px;
  top: 12px;
  border-right: none;
  border-top: none;
}

.is-popover-panel-enter-active,
.is-popover-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
}
.is-popover-panel-enter-from,
.is-popover-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.is-popover__panel--top-start.is-popover-panel-enter-from,
.is-popover__panel--top-start.is-popover-panel-leave-to {
  transform: translateY(4px);
}
</style>
