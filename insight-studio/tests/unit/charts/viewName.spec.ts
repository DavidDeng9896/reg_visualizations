import { describe, expect, it } from 'vitest'
import { isFactoryViewName, viewNameOnTypeChange } from '../../../src/shared/factories'
import type { ViewNode } from '../../../src/shared/types'

function view(name: string, type: ViewNode['type'] = 'bar'): ViewNode {
  return { id: name, name, type, filters: [], transforms: [], children: [] }
}

describe('图种切换时的默认视图名', () => {
  it('识别工厂默认名及其序号后缀', () => {
    expect(isFactoryViewName('Bar chart', 'bar')).toBe(true)
    expect(isFactoryViewName('Bar chart 2', 'bar')).toBe(true)
    expect(isFactoryViewName('我的图', 'bar')).toBe(false)
    expect(isFactoryViewName('Scatter plot', 'bar')).toBe(false)
  })

  it('仍是默认名时随图种改名；用户自定义名保留', () => {
    expect(viewNameOnTypeChange('Bar chart', 'bar', 'scatter', [])).toBe('Scatter plot')
    expect(viewNameOnTypeChange('我的散点', 'bar', 'scatter', [])).toBe('我的散点')
  })

  it('目标默认名已被占用时追加序号', () => {
    const name = viewNameOnTypeChange('Bar chart', 'bar', 'scatter', [view('Scatter plot', 'scatter')])
    expect(name).toBe('Scatter plot 2')
  })
})
