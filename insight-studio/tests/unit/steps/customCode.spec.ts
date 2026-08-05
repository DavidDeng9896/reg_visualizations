import { describe, expect, it, vi } from 'vitest'
import type { Analysis, AnalysisTable, StepNode } from '../../../src/shared/types'
import { createStepNode } from '../../../src/modules/steps/factory'
import { execCustomCode } from '../../../src/modules/steps/exec/customCode'
import { applyStepResult } from '../../../src/modules/steps/exec'

function makeTable(): AnalysisTable {
  return {
    id: 't1',
    name: 'Demo',
    source: 'csv',
    columns: [
      { field: 'stage', title: 'stage', dataType: 'string' },
      { field: 'n', title: 'n', dataType: 'number' },
    ],
    rows: [
      { stage: '开发中', n: 1 },
      { stage: '评估中', n: 2 },
    ],
    filters: [],
    views: [],
  }
}

function makeAnalysis(step: StepNode, table: AnalysisTable): Analysis {
  return {
    id: 'a1',
    name: 'a',
    createdAt: '',
    updatedAt: '',
    tables: [table],
    flowchartLayout: {},
    steps: [
      {
        id: 'up1',
        type: 'upload-csv',
        name: 'Upload',
        inputs: [],
        config: {},
        status: 'configured',
        output: { tables: [table.id], files: [], views: [] },
      },
      step,
    ],
    files: [],
  }
}

describe('custom-code exec', () => {
  it('物化 Worker 返回的 DataFrame', async () => {
    const table = makeTable()
    const step = createStepNode('custom-code')
    step.inputs = [{ port: 'Input datasets', from: { nodeId: 'up1', port: 'Output dataset' } }]
    step.config.code = 'def custom_code(inputs, **kwargs):\n    return [inputs[0]]\n'
    const analysis = makeAnalysis(step, table)

    const fetchImpl = vi.fn(async () => ({
      json: async () => ({
        ok: true,
        outputs: [
          {
            name: 'out',
            kind: 'dataframe',
            columns: [
              { field: 'stage', dataType: 'string' },
              { field: 'n', dataType: 'number' },
            ],
            rows: [{ stage: '开发中', n: 1 }],
          },
        ],
        stdout: '',
        stderr: '',
      }),
    })) as unknown as typeof fetch

    const result = await execCustomCode(
      { analysis, step, inputs: { 'Input datasets': [table] } },
      { fetchImpl },
    )
    expect(result.status).toBe('configured')
    expect(result.outputTables?.[0].rows).toHaveLength(1)
    applyStepResult(analysis, step, result)
    expect(step.output.tables).toHaveLength(1)
    expect(analysis.tables.some((t) => t.id === step.output.tables[0])).toBe(true)
  })

  it('Worker 失败时带行号错误', async () => {
    const table = makeTable()
    const step = createStepNode('custom-code')
    const analysis = makeAnalysis(step, table)
    const fetchImpl = vi.fn(async () => ({
      json: async () => ({
        ok: false,
        error: { message: 'boom', line: 12, type: 'ValueError' },
      }),
    })) as unknown as typeof fetch

    const result = await execCustomCode(
      { analysis, step, inputs: { 'Input datasets': [table] } },
      { fetchImpl },
    )
    expect(result.status).toBe('failed')
    expect(result.error).toContain('Line 12')
    expect(result.errorLine).toBe(12)
  })
})
