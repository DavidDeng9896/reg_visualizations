import { describe, expect, it } from 'vitest'
import { pythonPackagesPromptList, PYTHON_SCIENTIFIC_PACKAGES } from '../../../src/modules/steps/pythonPackages'
import { pythonChartId, pythonChartNodeId, chartIdFromPythonChartNode } from '../../../src/modules/steps/pythonCharts'
import { SYSTEM_PROMPT } from '../../../src/modules/ai/prompts'

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
})
