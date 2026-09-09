import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReasoningCard from '../../../src/modules/ai/ReasoningCard.vue'

describe('ReasoningCard 默认折叠', () => {
  it('streaming 时默认折叠，显示中文一行摘要，不展开英文思考', () => {
    const wrapper = mount(ReasoningCard, {
      props: {
        streaming: true,
        reasoning: 'User wants a scatter plot of step vs yield... Intent: chart_correlate',
      },
    })
    const head = wrapper.get('button.reason__head')
    expect(head.attributes('aria-expanded')).toBe('false')
    expect(head.text()).toContain('正在根据当前表生成图表…')
    expect(wrapper.find('.reason__body').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('chart_correlate')
  })

  it('已知 scatter 时摘要为「正在创建散点图…」', () => {
    const wrapper = mount(ReasoningCard, {
      props: {
        streaming: true,
        chartHint: 'scatter',
        reasoning: 'thinking…',
      },
    })
    expect(wrapper.text()).toContain('正在创建散点图…')
  })

  it('用户可手动展开看到全文；结束后折叠标题为「思考过程」', async () => {
    const wrapper = mount(ReasoningCard, {
      props: {
        streaming: false,
        reasoning: '用户要散点图与拟合',
      },
    })
    expect(wrapper.get('button.reason__head').attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).toContain('思考过程')
    await wrapper.get('button.reason__head').trigger('click')
    expect(wrapper.get('button.reason__head').attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('用户要散点图与拟合')
  })
})
