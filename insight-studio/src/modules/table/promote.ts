/**
 * 「提升为表」：把当前视图的 ViewResult 物化为新 AnalysisTable（可撤销）。
 */
import type { useAnalysisStore } from '../../stores/analysisStore'
import { runPipeline } from '../../shared/pipeline'
import { findTable, findView } from '../../shared/tree'
import { createTable, ensureRowIds } from '../../shared/factories'
import { toast } from '../../ui'

type Store = ReturnType<typeof useAnalysisStore>

/** 物化视图结果为新表，选中新表；返回新表 id（失败返回 null）。 */
export function promoteViewToTable(store: Store, tableId: string, viewId: string): string | null {
  const analysis = store.current
  if (!analysis) return null
  const table = findTable(analysis, tableId)
  const view = table ? findView(table.views, viewId) : null
  if (!table || !view) return null

  let result
  try {
    result = runPipeline(analysis, tableId, viewId)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '视图数据计算失败')
    return null
  }

  const name = `${view.name} (table)`
  const newTable = createTable(name, result.columns, ensureRowIds(result.rows.map((r) => ({ ...r }))), 'csv')
  if (result.sampled) {
    toast.warning(`视图超过采样上限，仅物化了 ${result.rows.length} / ${result.totalRows} 行`)
  }
  store.commit({
    label: `提升「${view.name}」为表`,
    undo: () => {
      const a = store.current
      if (a) a.tables = a.tables.filter((t) => t.id !== newTable.id)
    },
    redo: () => {
      const a = store.current
      if (a && !a.tables.some((t) => t.id === newTable.id)) a.tables.push(newTable)
    },
  })
  // commit 只登记历史；实际写入需立即执行一次 redo 语义
  store.mutate((a) => {
    if (!a.tables.some((t) => t.id === newTable.id)) a.tables.push(newTable)
  })
  store.select({ kind: 'table', tableId: newTable.id })
  toast.success(`已提升为新表「${name}」`)
  return newTable.id
}
