import { test, expect, type Page } from '@playwright/test'
import {
  createDemoAndEnter,
  createView,
  expectCanvasInk,
  openFlowchart,
  pickOption,
  selectTable,
  tableNode,
} from './helpers'

test.describe('g) 流程图', () => {
  test('节点渲染 → 拖节点 → 模式往返位置保留 → 双击跳回工作区选中', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'bar')

    await openFlowchart(page)
    // 3 张表 + 1 个视图节点
    await expect(page.locator('.vue-flow__node')).toHaveCount(4)

    // 拖动第一个表节点 (+180, +90)
    const node = page.locator('.vue-flow__node', { hasText: 'Iris measurements' }).first()
    const before = await node.getAttribute('style')
    const box = (await node.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 })
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2 + 90, { steps: 5 })
    await page.mouse.up()
    const after = await node.getAttribute('style')
    expect(after).not.toBe(before)

    // 切回工作区再切回 → 位置保留（KeepAlive + flowchartLayout 持久化）
    await page.getByRole('button', { name: 'Workspace' }).click()
    await expect(page.getByTestId('grid-stats')).toBeVisible()
    await openFlowchart(page)
    await expect(node).toHaveAttribute('style', after ?? '')

    // 双击节点 → 跳回工作区并选中该表
    await node.dblclick()
    await expect(page.getByTestId('grid-stats')).toBeVisible()
    await expect(page.locator('.dg__title')).toHaveText('Iris measurements')
    await expect(tableNode(page, 'Iris measurements')).toHaveClass(/tnode__row--selected/)
  })

  test('空 Analysis 流程图显示空态 CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    const dialog = page.getByRole('dialog', { name: '新建分析' })
    await dialog.getByPlaceholder('例如：Binding assay analysis').fill('Flow empty')
    await dialog.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    // 默认即流程图；空 Analysis 显示空态 CTA
    await expect(page.getByRole('heading', { name: '还没有数据' })).toBeVisible()
    await expect(page.locator('.flow-empty').getByRole('button', { name: 'Add data' })).toBeVisible()
  })

  test('黄色 BETA 提示条可关闭', async ({ page }) => {
    await createDemoAndEnter(page)
    await openFlowchart(page)
    const banner = page.locator('.flow-banner')
    await expect(banner).toBeVisible()
    await banner.getByLabel('关闭提示').click()
    await expect(banner).toBeHidden()
    // 模式往返后仍保持关闭（localStorage 记忆）
    await page.getByRole('button', { name: 'Workspace' }).click()
    await openFlowchart(page)
    await expect(page.locator('.flow-banner')).toHaveCount(0)
  })

  test('点击图表节点 → 侧边显示图表预览', async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await expect(page.getByRole('combobox', { name: 'Chart type' })).toBeVisible()
    await pickOption(page.getByRole('combobox', { name: 'X Axis' }), 'species')
    await pickOption(page.getByRole('combobox', { name: 'Y Axis' }), 'sepal_length')
    await expectCanvasInk(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()

    await openFlowchart(page)
    // 从工作区带入选中 → 详情卡可能已打开；确保点到图表节点
    const barNode = page.locator('.vue-flow__node').filter({ hasText: /Bar chart/i }).first()
    await expect(barNode).toBeVisible()
    await barNode.click({ force: true })

    const detail = page.getByRole('complementary', { name: '图表预览' })
    await expect(detail).toBeVisible()
    await expect(detail.getByText('Output chart')).toBeVisible()
    await expect(page.getByTestId('flow-chart-preview')).toBeVisible()
    // Plotly 渲染为 SVG（.plot-container），非 ECharts 的 canvas
    await expect(page.getByTestId('flow-chart-canvas').locator('.plot-container').first()).toBeVisible({ timeout: 10_000 })

    // 点空白关闭
    await page.locator('.vue-flow__pane').click({ position: { x: 20, y: 20 }, force: true })
    await expect(detail).toHaveCount(0)
  })

  test('工具栏添加步骤打开目录并可创建 Filter', async ({ page }) => {
    await createDemoAndEnter(page)
    await openFlowchart(page)
    await page.getByRole('button', { name: '添加步骤' }).click()
    await expect(page.locator('.add-step')).toBeVisible()
    await page.getByRole('button', { name: 'Filter table' }).click()
    await expect(page.locator('.vue-flow__node').filter({ hasText: 'Filter table' })).toBeVisible()
  })
})
