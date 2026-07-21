import { test, expect } from '@playwright/test'
import { createDemoAndEnter, expectCanvasInk, lassoOnChart, mapField, pickOption, selectTable, viewNode } from './helpers'

test.describe('h) 持久化', () => {
  test('刷新页面 → 视图/图表配置/打标/流程图布局全部保留', async ({ page }) => {
    await createDemoAndEnter(page)

    // 建 scatter 视图并保存配置（含自定义标题）
    await selectTable(page, 'Plate 96 dose-response')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'concentration')
    await mapField(page, 'Y Axis', 'response')
    await page.getByRole('tab', { name: 'STYLE' }).click()
    await page
      .locator('.sty__row')
      .filter({ has: page.locator('.sty__label', { hasText: /^Title$/ }) })
      .locator('input')
      .fill('持久化标题')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()

    // 打标一个区域（chart-panel--flagging 出现 = brush 已激活）
    const flagBtn = page.getByRole('button', { name: 'Flag', exact: true })
    await flagBtn.click()
    await expect(page.getByTestId('chart-canvas')).toHaveClass(/chart-panel--flagging/)
    await lassoOnChart(page, [
      [0.15, 0.2],
      [0.55, 0.2],
      [0.55, 0.75],
      [0.15, 0.75],
    ])
    const flagDialog = page.getByRole('dialog', { name: 'Flag selected points' })
    await expect(flagDialog).toBeVisible()
    await flagDialog.locator('textarea').fill('persist flag')
    await flagDialog.getByRole('button', { name: /^Flag \d+ 个点$/ }).click()
    await expect(page.locator('.cview__flagcount')).toContainText('flagged')

    // 流程图拖一个节点
    await page.getByRole('button', { name: 'Flowchart' }).click()
    const flowNode = page.locator('.vue-flow__node', { hasText: 'Plate 96 dose-response' }).first()
    await expect(flowNode).toBeVisible()
    const nbox = (await flowNode.boundingBox())!
    await page.mouse.move(nbox.x + nbox.width / 2, nbox.y + nbox.height / 2)
    await page.mouse.down()
    await page.mouse.move(nbox.x + nbox.width / 2 + 200, nbox.y + nbox.height / 2 + 100, { steps: 8 })
    await page.mouse.up()
    const nodeStyle = await flowNode.getAttribute('style')

    // 等待防抖落盘（400ms debounce + 余量）
    await page.waitForTimeout(900)
    await page.reload()
    await expect(page.getByTestId('sidebar-table').first()).toBeVisible()

    // 视图仍在侧栏
    const view = viewNode(page, 'Bar chart')
    await expect(view).toBeVisible()
    await view.click()
    await expectCanvasInk(page)

    // 打标保留
    await expect(page.locator('.cview__flagcount')).toContainText('flagged')

    // 图表配置保留：打开面板 → STYLE 标题值
    await page.locator('.cview__open').click()
    await page.getByRole('tab', { name: 'STYLE' }).click()
    await expect(
      page
        .locator('.sty__row')
        .filter({ has: page.locator('.sty__label', { hasText: /^Title$/ }) })
        .locator('input'),
    ).toHaveValue('持久化标题')

    // 流程图布局保留（vue-flow 重载时坐标可能四舍五入，容差 2px 比对）
    await page.getByRole('button', { name: 'Flowchart' }).click()
    const reloaded = page.locator('.vue-flow__node', { hasText: 'Plate 96 dose-response' }).first()
    await expect(reloaded).toBeVisible()
    const translateOf = (style: string | null) => {
      const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(style ?? '')
      return m ? ([Number(m[1]), Number(m[2])] as const) : null
    }
    const before = translateOf(nodeStyle)
    const after = translateOf(await reloaded.getAttribute('style'))
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(Math.abs(after![0] - before![0])).toBeLessThanOrEqual(2)
    expect(Math.abs(after![1] - before![1])).toBeLessThanOrEqual(2)

    // 列表页 Analysis 仍在
    await page.goto('/')
    await expect(page.getByTestId('analysis-card').filter({ hasText: 'Demo analysis' })).toBeVisible()
  })
})
