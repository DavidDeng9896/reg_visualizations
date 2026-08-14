/**
 * 平台工具工作区：浏览器 Pinia 与 dsh 后端 HTTP 共用同一套 execTool。
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Analysis, Dashboard } from '../../../shared/types'
import type { SelectedNode } from '../../../stores/analysisStore'
import type { AiFileMeta } from '../client'
import type { ImportedTableInfo } from '../attachments'
import type { RefreshSqlResult } from '../../table/refreshSqlSource'
import type { DbConnectionProfile } from '../../table/dbConnectionTypes'

export interface SkillSummary {
  id: string
  name: string
  description: string
  enabled: boolean
  source: string
}

export interface SkillDetail extends SkillSummary {
  body: string
}

export interface MemoryRecord {
  id: string
  content: string
}

export interface ToolWorkspace {
  current: Analysis | null
  selected: SelectedNode | null
  sqlConnections: DbConnectionProfile[]
  listAnalyses(): Promise<Analysis[]>
  getAnalysis(id: string): Promise<Analysis | undefined>
  putAnalysis(a: Analysis): Promise<void>
  load(id: string): Promise<boolean>
  mutate(fn: (analysis: Analysis) => void): void
  flush(): Promise<void>
  getDashboard(id: string): Promise<Dashboard | undefined>
  putDashboard(d: Dashboard): Promise<void>
  loadDashboardList(): Promise<void>
  loadDashboard(id: string): Promise<void>
  readonly currentDashboardId: string | null
  listSkills(): Promise<SkillSummary[]>
  getSkill(id: string): Promise<SkillDetail>
  listFiles(): Promise<AiFileMeta[]>
  fileMeta(id: string): Promise<AiFileMeta>
  importAiFile(
    att: { id: string; name: string; kind: AiFileMeta['kind'] },
    opts?: { tableNameHint?: string; sheetNames?: string[] },
  ): Promise<ImportedTableInfo[]>
  createMemory(content: string): Promise<MemoryRecord>
  refreshSqlSource(stepId: string): Promise<RefreshSqlResult>
}

const als = new AsyncLocalStorage<ToolWorkspace>()

export function getWorkspace(): ToolWorkspace {
  const ws = als.getStore()
  if (!ws) throw new Error('平台工具未绑定工作区')
  return ws
}

export function runWithWorkspace<T>(ws: ToolWorkspace, fn: () => T): T {
  return als.run(ws, fn)
}

export async function runWithWorkspaceAsync<T>(ws: ToolWorkspace, fn: () => Promise<T>): Promise<T> {
  return als.run(ws, fn)
}
