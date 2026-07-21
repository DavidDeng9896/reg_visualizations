import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** 点击元素外部时触发回调（用于 Popover/Select 关闭）。 */
export function useClickOutside(
  targets: Array<Ref<HTMLElement | undefined>>,
  handler: (e: MouseEvent) => void,
): void {
  const listener = (e: MouseEvent) => {
    const el = e.target as Node
    for (const t of targets) {
      if (t.value && t.value.contains(el)) return
    }
    handler(e)
  }
  onMounted(() => document.addEventListener('mousedown', listener, true))
  onBeforeUnmount(() => document.removeEventListener('mousedown', listener, true))
}

/** 全局 Esc 监听。 */
export function useEscape(handler: () => void, active: () => boolean = () => true): void {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && active()) {
      e.stopPropagation()
      handler()
    }
  }
  onMounted(() => document.addEventListener('keydown', listener, true))
  onBeforeUnmount(() => document.removeEventListener('keydown', listener, true))
}

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
