import { reactive } from 'vue'
import { uuid } from '../shared/id'

export type ToastKind = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  title?: string
  duration: number
  /** 同消息合并次数（≥2 时 UI 显示 ×N）。 */
  count: number
}

/** 全局 toast 单例状态（由 <ToastHost/> 渲染）。 */
const items = reactive<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function dismiss(id: string): void {
  const idx = items.findIndex((t) => t.id === id)
  if (idx >= 0) items.splice(idx, 1)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function push(kind: ToastKind, message: string, opts: { title?: string; duration?: number } = {}): string {
  const duration = opts.duration ?? (kind === 'error' ? 6000 : 3500)
  // 同 kind+message+title 的在场 toast 合并：计数 +1 并刷新计时，避免连击叠加爆炸
  const existing = items.find((t) => t.kind === kind && t.message === message && t.title === opts.title)
  if (existing) {
    existing.count += 1
    if (duration > 0) {
      const timer = timers.get(existing.id)
      if (timer) clearTimeout(timer)
      timers.set(existing.id, setTimeout(() => dismiss(existing.id), duration))
    }
    return existing.id
  }
  const id = uuid()
  items.push({ id, kind, message, title: opts.title, duration, count: 1 })
  if (duration > 0) timers.set(id, setTimeout(() => dismiss(id), duration))
  return id
}

/** 全局 toast service。 */
export const toast = {
  success: (message: string, opts?: { title?: string; duration?: number }) => push('success', message, opts),
  warning: (message: string, opts?: { title?: string; duration?: number }) => push('warning', message, opts),
  error: (message: string, opts?: { title?: string; duration?: number }) => push('error', message, opts),
  info: (message: string, opts?: { title?: string; duration?: number }) => push('info', message, opts),
  dismiss,
}

/** 供 ToastHost 读取当前 toast 列表。 */
export function useToastItems(): ToastItem[] {
  return items
}
