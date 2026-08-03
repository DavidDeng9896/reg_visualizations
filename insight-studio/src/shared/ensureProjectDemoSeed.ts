/**
 * 项目示例数据自动 / 手动写入编排。
 * - ensureProjectDemoSeed：仅空库时静默写入（启动用）
 * - seedProjectDemos({ force: true })：始终覆盖写入（首页按钮用）
 */
import type { AnalysisRepository } from './repository'
import { analysisRepository } from './repository'
import { createProjectDemoAnalyses, LEGACY_DEMO_IDS } from './demoProjects'

export interface SeedResult {
  seeded: boolean
  count?: number
}

type AnalysesChangedListener = () => void
const analysesChangedListeners = new Set<AnalysesChangedListener>()

/** 分析列表可能已变化（seed 写入后），侧栏等订阅后刷新。 */
export function onAnalysesPossiblyChanged(listener: AnalysesChangedListener): () => void {
  analysesChangedListeners.add(listener)
  return () => {
    analysesChangedListeners.delete(listener)
  }
}

function notifyAnalysesPossiblyChanged(): void {
  for (const listener of analysesChangedListeners) {
    try {
      listener()
    } catch (e) {
      console.error('[ensureProjectDemoSeed] listener failed', e)
    }
  }
}

export interface SeedProjectDemosOptions {
  /** true = 始终写入（覆盖同 id）；false = 仅空库写入。默认 false。 */
  force?: boolean
  /** 可注入仓库，便于单测。 */
  repo?: AnalysisRepository
}

/**
 * 写入项目示例分析。
 * force=false 时若库非空立即返回 { seeded: false }。
 */
export async function seedProjectDemos(options: SeedProjectDemosOptions = {}): Promise<SeedResult> {
  const force = options.force === true
  const repo = options.repo ?? analysisRepository

  if (!force) {
    const list = await repo.list()
    if (list.length > 0) return { seeded: false }
  }

  const demos = createProjectDemoAnalyses()
  for (const a of demos) await repo.put(a)

  // 清理旧版演示 id（与首页按钮逻辑一致；空库下通常无 legacy）
  const existing = new Set((await repo.list()).map((a) => a.id))
  for (const id of LEGACY_DEMO_IDS) {
    if (existing.has(id)) await repo.delete(id).catch(() => undefined)
  }

  notifyAnalysesPossiblyChanged()
  return { seeded: true, count: demos.length }
}

/** 模块级 in-flight：并行 ensure 合并为单次 put 序列。 */
let ensureInFlight: Promise<SeedResult> | null = null

/**
 * 启动时调用：仅分析库为空时自动 seed。
 * 成功写入返回 { seeded: true, count }；已有数据返回 { seeded: false }。
 * 无 toast、不路由跳转。
 */
export function ensureProjectDemoSeed(repo?: AnalysisRepository): Promise<SeedResult> {
  if (!ensureInFlight) {
    ensureInFlight = seedProjectDemos({ force: false, repo }).finally(() => {
      ensureInFlight = null
    })
  }
  return ensureInFlight
}

/** 测试用：重置 in-flight（勿在生产路径调用）。 */
export function __resetEnsureProjectDemoSeedForTests(): void {
  ensureInFlight = null
  analysesChangedListeners.clear()
}
