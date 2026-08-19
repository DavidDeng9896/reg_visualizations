import type { PortType, StepType } from '../../shared/types'
import type { StepDef } from '../steps/registry'

export interface AddStepGroup {
  key: string
  title: string
  defs: StepDef[]
}

const GROUP_ORDER: Array<{ key: StepDef['category']; title: string }> = [
  { key: 'code', title: 'Code' },
  { key: 'combine', title: 'Combine tables' },
  { key: 'transform', title: 'Transform' },
  { key: 'statistics', title: 'Statistics' },
  { key: 'output', title: 'Output' },
]

/**
 * 端口拖到空白处的 Add step 目录。
 * 已实现且（有兼容输入 或 独立 output 节点如 Report）的步骤可出现。
 */
export function filterAddableStepDefs(
  defs: StepDef[],
  opts: {
    implemented: ReadonlySet<string>
    sourcePortType?: PortType | null
    query?: string
  },
): StepDef[] {
  const q = (opts.query ?? '').trim().toLowerCase()
  return defs.filter((d) => {
    if (!opts.implemented.has(d.type as StepType) && !opts.implemented.has(d.type)) return false
    const standaloneOutput = d.inputs.length === 0 && d.category === 'output'
    if (d.inputs.length === 0 && !standaloneOutput) return false
    if (!standaloneOutput && opts.sourcePortType && !d.inputs.some((p) => p.type === opts.sourcePortType)) {
      return false
    }
    if (q && !d.label.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q)) return false
    return true
  })
}

export function groupAddableStepDefs(defs: StepDef[]): AddStepGroup[] {
  const out: AddStepGroup[] = GROUP_ORDER.map((g) => ({ key: g.key, title: g.title, defs: [] }))
  for (const def of defs) {
    const g = out.find((o) => o.key === def.category)
    if (g) g.defs.push(def)
  }
  return out.filter((g) => g.defs.length > 0)
}
