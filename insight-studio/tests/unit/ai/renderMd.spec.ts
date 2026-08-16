import { describe, expect, it } from 'vitest'
import { renderMd } from '../../../src/modules/ai/renderMd'

describe('renderMd', () => {
  it('merges consecutive prose lines into one paragraph', () => {
    const html = renderMd('第一行说明\n第二行继续\n\n下一段')
    expect(html).toContain('<p class="md-p">第一行说明 第二行继续</p>')
    expect(html).toContain('<p class="md-p">下一段</p>')
  })

  it('renders headings lists and code', () => {
    const html = renderMd('# 标题\n\n- a\n- b\n\n```\ncode\n```')
    expect(html).toContain('<h1 class="md-h md-h1">标题</h1>')
    expect(html).toContain('<ul class="md-ul">')
    expect(html).toContain('<li>a</li>')
    expect(html).toContain('<pre class="md-pre"><code>code</code></pre>')
  })

  it('escapes html', () => {
    const html = renderMd('<script>x</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('bold and inline code', () => {
    const html = renderMd('用 **group_by** 和 `map`')
    expect(html).toContain('<strong>group_by</strong>')
    expect(html).toContain('<code>map</code>')
  })
})
