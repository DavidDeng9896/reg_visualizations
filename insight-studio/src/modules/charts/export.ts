/**
 * 图表导出：PNG（getDataURL）/ PDF（jsPDF 嵌入 PNG）。
 * jsPDF 体积大（vendor 600+ kB），PDF 导出时才动态加载。
 */

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 由 ECharts 实例导出 PNG。 */
export function exportPng(getDataURL: () => string, filename: string): void {
  triggerDownload(getDataURL(), filename.endsWith('.png') ? filename : `${filename}.png`)
}

/** 由 ECharts 实例导出 PDF（PNG 嵌入单页）。 */
export function exportPdf(getDataURL: () => string, filename: string): void {
  const png = getDataURL()
  // 读取图片尺寸以决定 PDF 页面方向
  const img = new Image()
  img.onload = () => {
    void import('jspdf').then(({ jsPDF }) => {
      const landscape = img.width >= img.height
      const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 24
      const scale = Math.min((pageW - margin * 2) / img.width, (pageH - margin * 2) / img.height)
      const w = img.width * scale
      const h = img.height * scale
      pdf.addImage(png, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h)
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
    })
  }
  img.src = png
}
