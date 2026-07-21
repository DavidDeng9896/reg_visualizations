/**
 * 草稿编辑模型（交互核心，纯逻辑可测）。
 * 面板编辑的是 ChartConfig 的本地 deep clone；Save 写回 store，Cancel 丢弃恢复。
 */
import type { ChartConfig } from '../../shared/types'

export interface ChartDraft {
  /** 已保存配置（store 中快照）。 */
  saved: ChartConfig
  /** 编辑中的草稿。 */
  draft: ChartConfig
}

export function cloneConfig(c: ChartConfig): ChartConfig {
  return JSON.parse(JSON.stringify(c)) as ChartConfig
}

export function configsEqual(a: ChartConfig, b: ChartConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function createDraft(saved: ChartConfig): ChartDraft {
  const snap = cloneConfig(saved)
  return { saved: snap, draft: cloneConfig(snap) }
}

export function isDirty(d: ChartDraft): boolean {
  return !configsEqual(d.draft, d.saved)
}

/** 就地修改草稿。 */
export function updateDraft(d: ChartDraft, fn: (draft: ChartConfig) => void): void {
  fn(d.draft)
}

/** Cancel：丢弃草稿恢复已保存配置；返回是否确实丢弃了修改。 */
export function cancelDraft(d: ChartDraft): boolean {
  const was = isDirty(d)
  d.draft = cloneConfig(d.saved)
  return was
}

/** Save：草稿成为已保存配置；返回可写回 store 的副本。 */
export function commitDraft(d: ChartDraft): ChartConfig {
  d.saved = cloneConfig(d.draft)
  return cloneConfig(d.saved)
}

/** 150ms 防抖（实时预览用）。 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 150): { call: (...args: A) => void; flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: A | undefined
  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    lastArgs = undefined
  }
  return {
    call: (...args: A) => {
      lastArgs = args
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        const a = lastArgs
        lastArgs = undefined
        if (a) fn(...a)
      }, ms)
    },
    flush: () => {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
      if (lastArgs) {
        const a = lastArgs
        lastArgs = undefined
        fn(...a)
      }
    },
    cancel,
  }
}
