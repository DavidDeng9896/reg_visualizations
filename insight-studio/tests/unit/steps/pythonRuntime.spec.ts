import { describe, expect, it } from 'vitest'
import { pythonPackagesPromptList, PYTHON_SCIENTIFIC_PACKAGES } from '../../../src/modules/steps/pythonPackages'
import { pythonChartId, pythonChartNodeId, chartIdFromPythonChartNode, removeStepOwnedArtifacts } from '../../../src/modules/steps/pythonCharts'
import { SYSTEM_PROMPT } from '../../../src/modules/ai/prompts'
import { createEmptyAnalysis } from '../../../src/shared/factories'
import type { StepNode } from '../../../src/shared/types'

describe('pythonPackages', () => {
  it('含 rdkit / statsmodels / biopython / lmfit', () => {
    expect(PYTHON_SCIENTIFIC_PACKAGES).toEqual(expect.arrayContaining(['rdkit', 'statsmodels', 'biopython', 'lmfit']))
    expect(pythonPackagesPromptList()).toContain('rdkit')
  })

  it('不含 fastapi / uvicorn', () => {
    expect(PYTHON_SCIENTIFIC_PACKAGES).not.toContain('fastapi')
    expect(PYTHON_SCIENTIFIC_PACKAGES).not.toContain('uvicorn')
  })

  it('系统提示白名单与常量一致', () => {
    expect(SYSTEM_PROMPT).toContain(pythonPackagesPromptList())
  })

  it('与 worker SCIENTIFIC_PACKAGES 顺序与集合锁定', () => {
    expect([...PYTHON_SCIENTIFIC_PACKAGES]).toEqual([
      'pandas',
      'numpy',
      'scipy',
      'scikit-learn',
      'rdkit',
      'statsmodels',
      'biopython',
      'lmfit',
      'matplotlib',
      'seaborn',
      'kaleido',
      'plotly',
      'pyarrow',
      'openpyxl',
      'pydantic',
    ])
  })
})

describe('pythonChartId', () => {
  it('由 stepId 与输出名组成且重跑不变', () => {
    expect(pythonChartId('s1', 'Dose-response')).toBe('s1::Dose-response')
    expect(pythonChartId('s1', 'Dose-response')).toBe(pythonChartId('s1', 'Dose-response'))
  })

  it('流程图节点 id 可回解析', () => {
    const id = pythonChartId('s1', 'fig')
    expect(chartIdFromPythonChartNode(pythonChartNodeId(id))).toBe(id)
    expect(chartIdFromPythonChartNode('view:v1')).toBeNull()
  })

  it('removeStepOwnedArtifacts 去掉 charts 与 pychart 布局', () => {
    const a = createEmptyAnalysis('A')
    const step: StepNode = {
      id: 's1',
      type: 'custom-code',
      name: 'CC',
      inputs: [],
      config: {},
      status: 'configured',
      output: { tables: [], files: [], views: [], charts: ['s1::fig'] },
    }
    a.steps.push(step)
    a.charts = [{ id: 's1::fig', name: 'fig', stepId: 's1', plotlyJson: { data: [], layout: {} } }]
    a.flowchartLayout['step:s1'] = { x: 0, y: 0 }
    a.flowchartLayout['pychart:s1::fig'] = { x: 8, y: 0 }
    removeStepOwnedArtifacts(a, step)
    expect(a.charts).toEqual([])
    expect(a.flowchartLayout['pychart:s1::fig']).toBeUndefined()
    expect(a.flowchartLayout['step:s1']).toBeUndefined()
  })
})
