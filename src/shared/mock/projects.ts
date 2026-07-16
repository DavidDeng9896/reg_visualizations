import type { Project } from '@/shared/types/analysis'

/** Static mock projects (spec §0) */
export const MOCK_PROJECTS: Project[] = [
  { id: 'proj-general', name: 'General' },
  { id: 'proj-demo', name: 'Benchling Connect Demo' },
  { id: 'proj-assay', name: 'Assay Study' },
]

export function getProjectName(projectId: string): string {
  return MOCK_PROJECTS.find((p) => p.id === projectId)?.name ?? projectId
}
