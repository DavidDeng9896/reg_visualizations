import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TraceCard from '../../../src/modules/ai/TraceCard.vue'
import type { TraceItem } from '../../../src/modules/ai/aiStore'

function item(partial: Partial<TraceItem> & Pick<TraceItem, 'id' | 'name'>): TraceItem {
  return { summary: '', ...partial }
}

describe('TraceCard 进行中展示', () => {
  it('streaming 时自动展开，并显示正在执行的操作名', () => {
    const wrapper = mount(TraceCard, {
      props: {
        streaming: true,
        items: [item({ id: '1', name: 'list_tables', running: true })],
      },
    })
    expect(wrapper.get('[data-testid="ai-trace"]').attributes('data-in-progress')).toBe('true')
    expect(wrapper.get('[data-testid="ai-trace-head"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="ai-trace-list"]').isVisible()).toBe(true)
    expect(wrapper.text()).toContain('列出数据表')
    expect(wrapper.text()).toMatch(/已处理 1 个操作（完成 0）/)
  })

  it('排队中的操作不显示失败叉', () => {
    const wrapper = mount(TraceCard, {
      props: {
        streaming: true,
        items: [
          item({ id: '1', name: 'list_tables', running: true }),
          item({ id: '2', name: 'get_table_schema' }),
        ],
      },
    })
    expect(wrapper.find('.trace__fail').exists()).toBe(false)
    expect(wrapper.find('.trace__queued').exists()).toBe(true)
    expect(wrapper.text()).toContain('查看表结构')
  })

  it('结束后折叠标题只计已完成数', () => {
    const wrapper = mount(TraceCard, {
      props: {
        streaming: false,
        items: [
          item({ id: '1', name: 'list_tables', running: false, ok: true }),
          item({ id: '2', name: 'get_table_schema', running: false, ok: true }),
        ],
      },
    })
    expect(wrapper.get('[data-testid="ai-trace"]').attributes('data-in-progress')).toBeUndefined()
    expect(wrapper.text()).toContain('已处理 2 个操作（完成 2）')
  })
})
