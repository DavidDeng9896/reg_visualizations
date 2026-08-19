import { describe, expect, it, vi } from 'vitest'
import type { Analysis, AnalysisFile, AnalysisTable, StepNode } from '../../../src/shared/types'
import { createStepNode } from '../../../src/modules/steps/factory'
import {
  buildCustomCodeInputPayloads,
  execCustomCode,
} from '../../../src/modules/steps/exec/customCode'
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

function makeAnalysis(step: StepNode, table: AnalysisTable, files: AnalysisFile[] = []): Analysis {
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
    files,
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

  it('物化 figure 与 file 输出', async () => {
    const table = makeTable()
    const step = createStepNode('custom-code')
    step.inputs = [{ port: 'Input datasets', from: { nodeId: 'up1', port: 'Output dataset' } }]
    step.config.code = 'def custom_code(inputs, **kwargs):\n    return []\n'
    const analysis = makeAnalysis(step, table)

    const fetchImpl = vi.fn(async () => ({
      json: async () => ({
        ok: true,
        outputs: [
          {
            name: 'hist',
            kind: 'figure',
            plotlyJson: { data: [{ type: 'bar', x: ['a'], y: [1] }], layout: { title: 't' } },
          },
          {
            name: 'blob.txt',
            kind: 'file',
            filename: 'blob.txt',
            contentBase64: btoa('hello'),
          },
        ],
      }),
    })) as unknown as typeof fetch

    const result = await execCustomCode(
      { analysis, step, inputs: { 'Input datasets': [table] } },
      { fetchImpl },
    )
    expect(result.status).toBe('configured')
    expect(result.outputCharts?.[0].plotlyJson).toMatchObject({ data: expect.any(Array) })
    expect(result.outputFiles?.[0].name).toBe('blob.txt')
    applyStepResult(analysis, step, result)
    expect(step.output.charts).toHaveLength(1)
    expect(analysis.charts?.[0].name).toBe('hist')
    expect(analysis.charts?.[0].id).toBe(`${step.id}::hist`)
    const firstId = analysis.charts?.[0].id
    applyStepResult(analysis, step, result)
    expect(analysis.charts?.[0].id).toBe(firstId)
    expect(analysis.files.some((f) => f.name === 'blob.txt')).toBe(true)
    analysis.flowchartLayout[`pychart:${firstId}`] = { x: 1, y: 2 }

    const fetchOnlyTable = vi.fn(async () => ({
      json: async () => ({
        ok: true,
        outputs: [
          {
            name: 'out',
            kind: 'dataframe',
            columns: [{ field: 'n', dataType: 'number' }],
            rows: [{ n: 1 }],
          },
        ],
      }),
    })) as unknown as typeof fetch
    const next = await execCustomCode(
      { analysis, step, inputs: { 'Input datasets': [table] } },
      { fetchImpl: fetchOnlyTable },
    )
    applyStepResult(analysis, step, next)
    expect(analysis.charts ?? []).toHaveLength(0)
    expect(step.output.charts).toEqual([])
    expect(analysis.flowchartLayout[`pychart:${firstId}`]).toBeUndefined()
  })

  it('按连线顺序混入 Input files', () => {
    const table = makeTable()
    const file: AnalysisFile = {
      id: 'f1',
      name: 'notes.txt',
      sizeBytes: 5,
      mimeHint: 'text/plain',
      contentRef: `data:text/plain;base64,${btoa('hello')}`,
      importedAt: '',
    }
    const step = createStepNode('custom-code')
    step.inputs = [
      { port: 'Input datasets', from: { nodeId: 'up1', port: 'Output dataset' } },
      { port: 'Input files', from: { nodeId: 'fs1', port: 'Output files' } },
    ]
    const analysis = makeAnalysis(step, table, [file])
    analysis.steps.splice(1, 0, {
      id: 'fs1',
      type: 'import-files',
      name: 'Files',
      inputs: [],
      config: {},
      status: 'configured',
      output: { tables: [], files: ['f1'], views: [] },
    })

    const built = buildCustomCodeInputPayloads(analysis, step, analysis.files)
    expect(built.error).toBeUndefined()
    expect(built.payloads).toHaveLength(2)
    expect(built.payloads[0].kind).toBe('dataframe')
    expect(built.payloads[1].kind).toBe('file')
    expect(built.payloads[1].name).toBe('notes.txt')
  })

  it('Worker 失败时带行号错误', async () => {
    const table = makeTable()
    const step = createStepNode('custom-code')
    step.inputs = [{ port: 'Input datasets', from: { nodeId: 'up1', port: 'Output dataset' } }]
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
