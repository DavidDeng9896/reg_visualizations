import { describe, expect, it } from 'vitest'
import { fileSelectedStatus, isCsvFileName } from '@/shared/ui/uploadStatus'

describe('uploadStatus', () => {
  it('announces selected file name for live regions', () => {
    expect(fileSelectedStatus('')).toBe('')
    expect(fileSelectedStatus('demo.csv')).toBe('已选择文件：demo.csv')
    expect(fileSelectedStatus('  assay data.csv  ')).toBe('已选择文件：assay data.csv')
  })

  it('accepts csv file names case-insensitively', () => {
    expect(isCsvFileName('demo.csv')).toBe(true)
    expect(isCsvFileName('DEMO.CSV')).toBe(true)
    expect(isCsvFileName('notes.txt')).toBe(false)
    expect(isCsvFileName('')).toBe(false)
  })
})
