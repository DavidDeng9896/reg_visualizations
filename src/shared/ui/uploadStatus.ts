/** Live-region helpers for native file upload controls. */

export function fileSelectedStatus(fileName: string): string {
  const name = fileName.trim()
  if (!name) return ''
  return `已选择文件：${name}`
}

export function isCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName.trim())
}
