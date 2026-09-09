/**
 * P0-3 docs-as-tables：非表格附件硬拒绝；拒绝说明后禁止编造 CSV（Aegis TWO_STEP）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createDemoAnalysis } from '../../../src/shared/seed'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { execTool, type ToolCtx } from '../../../src/modules/ai/tools/impl'
import { buildTableCatalog, TABLE_CATALOG_MARK } from '../../../src/modules/ai/tableSchema'
import { isNonTabularAiFile, NON_TABULAR_INVENT_CSV_FAIL } from '../../../src/modules/ai/nonTabularImport'

const baseCtx = (): ToolCtx => ({
  confirmDestructive: true,
  confirmWrite: false,
  rejectedDocFileIds: new Set<string>(),
})

async function seedStore() {
  const store = useAnalysisStore()
  const a = createDemoAnalysis()
  store.$patch((state) => {
    state.current = a
    state.dirty = false
    state.selected = null
    state.mode = 'workspace'
  })
  return { store, analysis: a }
}

describe('P0-3 docs-as-tables', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isNonTabularAiFile：text/pdf 与说明文件名视为非表格', () => {
    expect(isNonTabularAiFile({ kind: 'text', name: 'cadd_数据说明.txt' })).toBe(true)
    expect(isNonTabularAiFile({ kind: 'pdf', name: 'protocol.pdf' })).toBe(true)
    expect(isNonTabularAiFile({ kind: 'other', name: 'notes.md' })).toBe(true)
    expect(isNonTabularAiFile({ kind: 'csv', name: 'docking.csv' })).toBe(false)
    expect(isNonTabularAiFile({ kind: 'excel', name: 'pk.xlsx' })).toBe(false)
  })

  it('import_ai_file：EO035 数据说明.txt 硬拒绝，不入 TableCatalog', async () => {
    const { analysis } = await seedStore()
    const before = analysis.tables.length
    const beforeCatalog = buildTableCatalog(analysis)
    const { aiFilesApi } = await import('../../../src/modules/ai/client')
    vi.spyOn(aiFilesApi, 'meta').mockResolvedValue({
      id: 'file-eo035-shuoming',
      name: 'cadd_数据说明.txt',
      mime: 'text/plain',
      sizeBytes: 120,
      createdAt: new Date().toISOString(),
      kind: 'text',
    })
    const ctx = baseCtx()
    const res = await execTool('import_ai_file', { fileId: 'file-eo035-shuoming' }, ctx)
    expect(res.ok).toBe(false)
    expect(res.summary).toMatch(/说明文档|禁止 import_ai_file/)
    expect(res.summary).toMatch(/TableCatalog|不会写入/)
    expect(res.summary).not.toMatch(/import_csv_text|生成数据表|编造|虚构|Custom Code/i)
    expect(analysis.tables).toHaveLength(before)
    expect(buildTableCatalog(analysis)).toBe(beforeCatalog)
    expect(beforeCatalog.startsWith(TABLE_CATALOG_MARK)).toBe(true)
    expect(ctx.rejectedDocFileIds?.has('file-eo035-shuoming')).toBe(true)
  })

  it('Aegis TWO_STEP：拒绝说明后禁止 import_csv_text 编造 CSV', async () => {
    const { analysis } = await seedStore()
    const before = analysis.tables.length
    const { aiFilesApi } = await import('../../../src/modules/ai/client')
    vi.spyOn(aiFilesApi, 'meta').mockResolvedValue({
      id: 'file-shuoming-only',
      name: 'eo035_数据说明总体说明.txt',
      mime: 'text/plain',
      sizeBytes: 80,
      createdAt: new Date().toISOString(),
      kind: 'text',
    })
    // 会话仅有说明文档，无 csv/excel
    vi.spyOn(aiFilesApi, 'list').mockResolvedValue([
      {
        id: 'file-shuoming-only',
        name: 'eo035_数据说明总体说明.txt',
        mime: 'text/plain',
        sizeBytes: 80,
        createdAt: new Date().toISOString(),
        kind: 'text',
      },
    ])

    const ctx = baseCtx()
    const step1 = await execTool('import_ai_file', { fileId: 'file-shuoming-only' }, ctx)
    expect(step1.ok).toBe(false)
    expect(step1.summary).not.toMatch(/import_csv_text/)

    // Step 2：模型试图根据说明编造 CSV — 必须硬拒绝
    const invented = readFileSync(
      join(__dirname, '../../fixtures/data_entry_ai/cadd_数据说明.txt'),
      'utf8',
    )
    const step2 = await execTool(
      'import_csv_text',
      {
        tableName: '伪造说明表',
        csv: `content\n"${invented.replace(/"/g, '""')}"`,
      },
      ctx,
    )
    expect(step2.ok).toBe(false)
    expect(step2.summary).toContain(NON_TABULAR_INVENT_CSV_FAIL.slice(0, 12))
    expect(step2.summary).toMatch(/禁止.*编造|说明.*仅供阅读|不要根据说明/)
    expect(analysis.tables).toHaveLength(before)
  })

  it('Aegis TWO_STEP：若会话另有真实 CSV 附件，仍允许 import_csv_text', async () => {
    const { analysis } = await seedStore()
    const { aiFilesApi } = await import('../../../src/modules/ai/client')
    vi.spyOn(aiFilesApi, 'meta').mockResolvedValue({
      id: 'file-doc',
      name: 'readme.md',
      mime: 'text/markdown',
      sizeBytes: 10,
      createdAt: new Date().toISOString(),
      kind: 'text',
    })
    vi.spyOn(aiFilesApi, 'list').mockResolvedValue([
      {
        id: 'file-doc',
        name: 'readme.md',
        mime: 'text/markdown',
        sizeBytes: 10,
        createdAt: new Date().toISOString(),
        kind: 'text',
      },
      {
        id: 'file-csv',
        name: 'docking.csv',
        mime: 'text/csv',
        sizeBytes: 40,
        createdAt: new Date().toISOString(),
        kind: 'csv',
      },
    ])
    const ctx = baseCtx()
    await execTool('import_ai_file', { fileId: 'file-doc' }, ctx)
    const res = await execTool(
      'import_csv_text',
      { tableName: 'real_paste', csv: 'id,v\na,1\nb,2' },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(analysis.tables.some((t) => t.name === 'real_paste')).toBe(true)
  })
})
