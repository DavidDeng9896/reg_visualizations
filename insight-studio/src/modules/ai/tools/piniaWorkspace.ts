/**
 * 浏览器工作区：把 Pinia store / Dexie-or-HTTP repository 接到 ToolWorkspace。
 */
import { analysisRepository } from '../../../shared/repository'
import { dashboardRepository } from '../../../shared/dashboardRepository'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { useDashboardStore } from '../../../stores/dashboardStore'
import { aiFilesApi, aiMemoriesApi, aiSkillsApi } from '../client'
import { attachmentFromMeta, importAiAttachment } from '../attachments'
import { refreshSqlSourceStep } from '../../table/refreshSqlSource'
import { listDbConnections } from '../../table/dbConnections'
import type { Analysis } from '../../../shared/types'
import type { ToolWorkspace } from './workspace'

export function createPiniaWorkspace(): ToolWorkspace {
  const analysis = useAnalysisStore()
  const dash = useDashboardStore()
  return {
    get current() {
      return analysis.current
    },
    get selected() {
      return analysis.selected
    },
    get sqlConnections() {
      return listDbConnections()
    },
    listAnalyses: () => analysisRepository.list(),
    getAnalysis: (id) => analysisRepository.get(id),
    async putAnalysis(a: Analysis) {
      await analysisRepository.put(a)
    },
    load: (id) => analysis.load(id),
    mutate(fn) {
      analysis.mutate(fn)
    },
    flush: () => analysis.saveNow(),
    getDashboard: (id) => dashboardRepository.get(id),
    putDashboard: (d) => dashboardRepository.put(d),
    loadDashboardList: async () => {
      await dash.loadList()
    },
    loadDashboard: async (id) => {
      await dash.loadOne(id)
    },
    get currentDashboardId() {
      return dash.currentId
    },
    async listSkills() {
      return aiSkillsApi.list()
    },
    getSkill: (id) => aiSkillsApi.get(id),
    listFiles: () => aiFilesApi.list(),
    fileMeta: (id) => aiFilesApi.meta(id),
    importAiFile(att, opts) {
      return importAiAttachment(attachmentFromMeta(att as never, { importAsTable: true }), opts)
    },
    createMemory: (content) => aiMemoriesApi.create(content),
    refreshSqlSource: (stepId) => refreshSqlSourceStep(stepId),
  }
}
