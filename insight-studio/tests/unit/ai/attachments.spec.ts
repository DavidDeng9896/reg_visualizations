import { describe, expect, it } from 'vitest'
import { clipText, excelSelectionValid, buildAttachmentCatalog, formatUserAttachmentLine, type ChatAttachment } from '../../../src/modules/ai/attachments'
import { buildMentionContext } from '../../../src/modules/ai/context'
import { attachmentKindIcon, mentionIcon } from '../../../src/modules/ai/mentionIcons'
import type { Analysis } from '../../../src/shared/types'

function analysis(partial: Partial<Analysis> = {}): Analysis {
  return {
    id: 'a1',
    name: '测试分析',
    tables: [],
    steps: [],
    ...partial,
  } as Analysis
}

function att(partial: Partial<ChatAttachment> & Pick<ChatAttachment, 'id' | 'name' | 'kind'>): ChatAttachment {
  return {
    mime: 'application/octet-stream',
    sizeBytes: 10,
    forAi: true,
    importAsTable: false,
    ...partial,
  }
}

describe('clipText', () => {
  it('短文本原样返回', () => {
    expect(clipText('hello', 10)).toBe('hello')
  })
  it('超长截断并标注', () => {
    const s = 'a'.repeat(20)
    expect(clipText(s, 10)).toBe(`${'a'.repeat(10)}\n…(已截断)`)
  })
})

describe('excelSelectionValid', () => {
  it('非 excel 恒为 true', () => {
    expect(excelSelectionValid(att({ id: '1', name: 'a.csv', kind: 'csv', forAi: true }))).toBe(true)
  })
  it('excel 开启 forAi 时必须选表', () => {
    expect(
      excelSelectionValid(att({ id: '1', name: 'a.xlsx', kind: 'excel', forAi: true, selectedSheets: [] })),
    ).toBe(false)
    expect(
      excelSelectionValid(
        att({ id: '1', name: 'a.xlsx', kind: 'excel', forAi: true, selectedSheets: ['Sheet1'] }),
      ),
    ).toBe(true)
  })
  it('excel 仅导入时也必须选表', () => {
    expect(
      excelSelectionValid(
        att({ id: '1', name: 'a.xlsx', kind: 'excel', forAi: false, importAsTable: true, selectedSheets: [] }),
      ),
    ).toBe(false)
  })
  it('excel 都不读也不导入时可不选', () => {
    expect(
      excelSelectionValid(
        att({ id: '1', name: 'a.xlsx', kind: 'excel', forAi: false, importAsTable: false, selectedSheets: [] }),
      ),
    ).toBe(true)
  })
})

describe('buildMentionContext attachments', () => {
  it('无分析时仍可输出附件引用', () => {
    const text = buildMentionContext(null, [{ kind: 'attachment', fileId: 'f1', name: 'sales.csv' }])
    expect(text).toContain('sales.csv')
    expect(text).toContain('f1')
  })
  it('无 targets 返回空', () => {
    expect(buildMentionContext(analysis(), [])).toBe('')
  })
  it('无分析时忽略表引用但保留附件', () => {
    const text = buildMentionContext(null, [
      { kind: 'table', tableId: 't1' },
      { kind: 'attachment', fileId: 'f2', name: 'x.pdf' },
    ])
    expect(text).not.toContain('表')
    expect(text).toContain('x.pdf')
  })
})

describe('mentionIcon attachment', () => {
  it('按 fileKind 选图标', () => {
    expect(mentionIcon({ kind: 'attachment', fileId: '1', fileKind: 'image' }, null)).toBe('image')
    expect(mentionIcon({ kind: 'attachment', fileId: '1', fileKind: 'pdf' }, null)).toBe('file-text')
    expect(mentionIcon({ kind: 'attachment', fileId: '1', fileKind: 'csv' }, null)).toBe('table')
    expect(mentionIcon({ kind: 'attachment', fileId: '1' }, null)).toBe('file')
  })
})

describe('attachmentKindIcon', () => {
  it('映射 kind', () => {
    expect(attachmentKindIcon('excel')).toBe('table')
    expect(attachmentKindIcon('text')).toBe('file-text')
    expect(attachmentKindIcon('other')).toBe('file')
  })
})

describe('buildAttachmentCatalog / formatUserAttachmentLine', () => {
  it('生成含 fileId 的目录与用户摘要', () => {
    const catalog = buildAttachmentCatalog([
      att({ id: 'f1', name: 'antibody.xlsx', kind: 'excel', selectedSheets: ['Sheet1'] }),
      att({ id: 'f1', name: 'dup', kind: 'excel' }),
      att({ id: 'f2', name: 'pic.png', kind: 'image' }),
    ])
    expect(catalog).toContain('## 会话附件目录')
    expect(catalog).toContain('id=f1')
    expect(catalog).toContain('antibody.xlsx')
    expect(catalog).toContain('import_ai_file')
    expect(catalog).not.toContain('pic.png')

    expect(formatUserAttachmentLine([att({ id: 'f1', name: 'antibody.xlsx', kind: 'excel' })])).toContain(
      'id=f1',
    )
  })

  it('空列表返回空串', () => {
    expect(buildAttachmentCatalog([])).toBe('')
    expect(formatUserAttachmentLine([])).toBe('')
  })
})
