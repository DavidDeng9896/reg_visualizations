/**
 * 套索打标纯逻辑（可测）：添加/移除/查询 flags。
 * flags 存于 ViewNode.flags（rowId + comment），store.mutate 落盘，commit 入撤销栈。
 */
import type { RowFlag } from '../../shared/types'

export type AddFlagsResult = { ok: true; flags: RowFlag[]; added: number } | { ok: false; error: string }

/**
 * 添加打标：comment 必填；已打标的 rowId 更新 comment（覆盖）。
 * 返回新数组（不就地修改）。
 */
export function addFlags(existing: RowFlag[], rowIds: string[], comment: string): AddFlagsResult {
  const text = comment.trim()
  if (!text) return { ok: false, error: 'Comment 不能为空' }
  const ids = [...new Set(rowIds)]
  if (!ids.length) return { ok: false, error: '未选择任何数据点' }
  const idSet = new Set(ids)
  const kept = existing.filter((f) => !idSet.has(f.rowId))
  const flags = [...kept, ...ids.map((rowId) => ({ rowId, comment: text }))]
  return { ok: true, flags, added: ids.length }
}

/** 移除打标；返回新数组与实际移除数。 */
export function removeFlags(existing: RowFlag[], rowIds: string[]): { flags: RowFlag[]; removed: number } {
  const idSet = new Set(rowIds)
  const flags = existing.filter((f) => !idSet.has(f.rowId))
  return { flags, removed: existing.length - flags.length }
}

export function flagSetOf(flags: RowFlag[] | undefined | null): Set<string> {
  return new Set((flags ?? []).map((f) => f.rowId))
}

export function flagCommentOf(flags: RowFlag[] | undefined | null, rowId: string): string | undefined {
  return (flags ?? []).find((f) => f.rowId === rowId)?.comment
}
