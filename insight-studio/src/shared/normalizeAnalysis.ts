/**
 * 加载时规范化 Analysis：补齐 revision 等新字段，保证旧 Dexie 文档可用。
 */
import type { Analysis } from './types'

export function normalizeAnalysis(analysis: Analysis): Analysis {
  if (typeof analysis.revision !== 'number' || !Number.isFinite(analysis.revision) || analysis.revision < 0) {
    analysis.revision = 0
  }
  if (!Array.isArray(analysis.files)) analysis.files = []
  if (!Array.isArray(analysis.steps)) analysis.steps = []
  if (!analysis.flowchartLayout) analysis.flowchartLayout = {}
  return analysis
}
