import { describe, expect, it } from 'vitest'
import { summarizePythonResponse } from '../../../src/modules/ai/tools/pythonExec'

describe('summarizePythonResponse（run_python_code 摘要）', () => {
  it('成功：产物摘要 + stdout', () => {
    const s = summarizePythonResponse({
      ok: true,
      stdout: 'hello\n',
      outputs: [
        { name: 'result', kind: 'dataframe', columns: [{ field: 'a' }, { field: 'b' }], rows: [{ a: 1, b: 'x' }] },
        { name: 'fig', kind: 'figure' },
      ],
    })
    expect(s).toContain('执行成功')
    expect(s).toContain('hello')
    expect(s).toContain('输出表「result」：1 行 × 2 列')
    expect(s).toContain('a=1')
    expect(s).toContain('输出图表「fig」')
  })

  it('失败：含行号与错误信息', () => {
    const s = summarizePythonResponse({
      ok: false,
      error: { message: "NameError: name 'df' is not defined", line: 3 },
      stderr: 'Traceback…',
    })
    expect(s).toContain('执行失败')
    expect(s).toContain('Line 3')
    expect(s).toContain('NameError')
  })

  it('超长 stdout 被截断', () => {
    const s = summarizePythonResponse({ ok: true, stdout: 'x'.repeat(5000) })
    expect(s.length).toBeLessThan(3000)
    expect(s).toContain('已截断')
  })
})
