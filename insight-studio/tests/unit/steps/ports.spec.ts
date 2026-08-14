import { describe, expect, it } from 'vitest'
import { listStepDefs, tableOutputPortName, resolveTableOutputPort } from '../../../src/modules/steps/registry'
import { IMPLEMENTED_STEP_TYPES } from '../../../src/modules/steps/exec'
import { TOOL_DEFS } from '../../../src/modules/ai/tools/registry'
import { WORKER_SPECS } from '../../../src/modules/ai/tools/workers'
import type { StepType } from '../../../src/shared/types'

/** 流程图节点 → agent 能否配置。无工具的节点不是测试漏跑，是产品缺口。 */
const AGENT_STEP_TOOLS: Record<string, string[] | 'none'> = {
  'upload-csv': ['import_csv_text', 'import_ai_file'],
  'upload-xlsx': ['import_ai_file'],
  'query-sql': ['refresh_sql_source'],
  'import-files': 'none',
  'file-to-table': 'none',
  join: ['add_join_step'],
  union: ['add_union_step'],
  filter: ['add_filter_step'],
  'hide-columns': ['add_hide_columns_step'],
  'computed-column': ['add_computed_column_step'],
  'convert-formats': 'none',
  'find-replace': 'none',
  aggregate: 'none',
  bin: 'none',
  pivot: 'none',
  window: 'none',
  'format-columns': 'none',
  dedupe: 'none',
  sort: 'none',
  interpolation: 'none',
  'custom-code': ['add_custom_code_step', 'update_custom_code_step', 'run_step'],
  report: ['create_report_step', 'update_report_step'],
}

const SOURCE_STEP_TYPES = new Set(['upload-csv', 'upload-xlsx', 'query-sql'])

describe('流程图节点 vs agent 工具', () => {
  it('每个注册节点都在矩阵里，且已实现 exec 的节点 agent 都能配（query-sql 仅刷新）', () => {
    const defs = listStepDefs()
    expect(defs.map((d) => d.type).sort()).toEqual(Object.keys(AGENT_STEP_TOOLS).sort())
    for (const def of defs) {
      const mapped = AGENT_STEP_TOOLS[def.type]
      expect(mapped, def.type).toBeDefined()
      const implemented = IMPLEMENTED_STEP_TYPES.has(def.type) || SOURCE_STEP_TYPES.has(def.type)
      if (implemented) {
        expect(mapped, `${def.type} 已实现却无 agent 工具`).not.toBe('none')
      }
    }
  })

  it('矩阵里标 none 的节点确实没有对应 add_* 工具', () => {
    const names = new Set(TOOL_DEFS.map((t) => t.name))
    for (const [type, tools] of Object.entries(AGENT_STEP_TOOLS)) {
      if (tools === 'none') {
        expect(names.has(`add_${type.replace(/-/g, '_')}_step`), type).toBe(false)
      } else {
        for (const t of tools) expect(names.has(t), `${type} → ${t}`).toBe(true)
      }
    }
  })

  it('已实现步骤的表输出端口可被 tableOutputPortName / 单复数别名解析', () => {
    const types = [...IMPLEMENTED_STEP_TYPES, ...SOURCE_STEP_TYPES] as StepType[]
    for (const type of types) {
      const def = listStepDefs().find((d) => d.type === type)
      if (!def) continue
      const tableOut = def.outputs.filter((o) => o.type === 'table')
      if (!tableOut.length) {
        expect(type).toBe('report')
        continue
      }
      const canonical = tableOutputPortName(type)
      expect(tableOut.some((o) => o.name === canonical)).toBe(true)
      expect(resolveTableOutputPort(type, canonical)).toBe(canonical)
      expect(resolveTableOutputPort(type, 'Output dataset')).toBeTruthy()
      expect(resolveTableOutputPort(type, 'Output datasets')).toBeTruthy()
    }
  })

  it('Custom Code 规范口是 Output datasets，Filter 是 Output dataset', () => {
    expect(tableOutputPortName('custom-code')).toBe('Output datasets')
    expect(tableOutputPortName('filter')).toBe('Output dataset')
    expect(tableOutputPortName('join')).toBe('Output dataset')
    expect(resolveTableOutputPort('custom-code', 'Output dataset')).toBe('Output datasets')
    expect(resolveTableOutputPort('filter', 'Output datasets')).toBe('Output dataset')
  })
})

describe('子代理白名单完整性', () => {
  it('四个子代理角色与互斥边界固定', () => {
    expect(Object.keys(WORKER_SPECS)).toEqual([
      'delegate_skill_worker',
      'delegate_mcp_worker',
      'delegate_analysis_worker',
      'delegate_code_worker',
    ])
    expect(WORKER_SPECS.delegate_skill_worker.allowBuiltin).toEqual(['list_skills', 'read_skill'])
    expect(WORKER_SPECS.delegate_mcp_worker.allowBuiltin).toEqual([])
    expect(WORKER_SPECS.delegate_mcp_worker.allowMcp).toBe(true)

    const analysis = new Set(WORKER_SPECS.delegate_analysis_worker.allowBuiltin)
    for (const t of [
      'add_join_step',
      'add_union_step',
      'add_hide_columns_step',
      'add_filter_step',
      'create_view',
      'set_chart_config',
      'create_dashboard',
      'create_report_step',
      'add_custom_code_step',
    ]) {
      expect(analysis.has(t), t).toBe(true)
    }
    expect(analysis.has('delete_table')).toBe(false)
    expect(analysis.has('clear_analysis')).toBe(false)

    const code = new Set(WORKER_SPECS.delegate_code_worker.allowBuiltin)
    expect(code.has('add_custom_code_step')).toBe(true)
    expect(code.has('set_chart_config')).toBe(false)
    expect(code.has('add_join_step')).toBe(false)
  })
})
