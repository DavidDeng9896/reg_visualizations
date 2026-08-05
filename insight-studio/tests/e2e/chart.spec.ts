import { test, expect, type Page } from '@playwright/test'
import {
  createDemoAndEnter,
  createView,
  ensureWorkspace,
  expectCanvasInk,
  expectNoErrorToast,
  lassoOnChart,
  mapField,
  pickOption,
  selectTable,
  viewNode,
} from './helpers'

/** 建 scatter 视图（plate：concentration × response），面板自动打开。 */
async function setupPlateScatter(page: Page): Promise<void> {
  await createDemoAndEnter(page)
  await selectTable(page, 'Plate 96 dose-response')
  await page.getByRole('button', { name: '创建图表' }).click()
  // 必填缺失 → 面板自动打开
  await expect(page.getByRole('combobox', { name: 'Chart type' })).toBeVisible()
  await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
  await mapField(page, 'X Axis', 'concentration')
  await mapField(page, 'Y Axis', 'response')
  await expectCanvasInk(page)
}

test.describe('d) 图表：scatter 配置 + STYLE 样式', () => {
  test('plate 建 scatter → 映射 x/y → canvas 有墨迹 → STYLE 改点形状 → Save', async ({ page }) => {
    await setupPlateScatter(page)

    const plot = page.getByTestId('chart-canvas')
    const svgBefore = await plot.innerHTML()

    // STYLE → Point Shape（标题/副标题为死控件已移除，预览以 marker symbol 变化验证）
    await page.getByRole('tab', { name: 'STYLE' }).click()
    const shapeSelect = page
      .locator('.sty__row')
      .filter({ has: page.locator('.sty__label', { hasText: /^Point Shape$/ }) })
      .getByRole('combobox')
    await pickOption(shapeSelect, '▲ Triangle')

    // 实时预览：Plotly SVG 内容变化（marker symbol 改变）
    await expect
      .poll(async () => plot.innerHTML())
      .not.toBe(svgBefore)

    // Save → toast + Save 按钮 dirty 高亮消失
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).not.toHaveClass(/ccpanel__save--dirty/)
    await expectNoErrorToast(page)
  })
})

test.describe('e) 拟合 + 套索打标', () => {
  // Plotly 迁移阶段暂未接入套索打标。
  test.skip('REGRESSION 4PL → 拟合线出现 → MODEL VARIABLES 参数行 → Flag 套索 → × 出现', async ({ page }) => {
    await setupPlateScatter(page)

    // 4PL 拟合
    await pickOption(page.getByRole('combobox', { name: '回归模型' }), '4PL')

    // MODEL VARIABLES tab 可用且有参数行（concentration=0 的 DMSO 点被忽略 → 可能有警告条，但拟合成功）
    const varsTab = page.getByRole('tab', { name: 'MODEL VARIABLES' })
    await expect(varsTab).not.toHaveAttribute('aria-disabled', 'true', { timeout: 20_000 })
    await varsTab.click()
    const varsTable = page.locator('.mtabs__table--vars')
    await expect(varsTable).toContainText('Min')
    await expect(varsTable).toContainText('Max')
    await expect(varsTable).toContainText('Hill Slope')
    await expect(varsTable).toContainText('Inflection Point')

    // 拟合线 = 额外墨迹（拟合后 canvas 像素数显著多于纯散点是弱断言，这里以参数行 + 无错误为准）
    await expectNoErrorToast(page)

    // 收起底部 MODEL TABLES 面板（否则图表被压扁，套索圈不到点）
    await page.locator('.mtabs__collapse').click()

    // Flag 模式 → 套索（echarts 5.6 polygon brush：自由拖拽轨迹，mouseup 自动闭合）
    // 圈选几乎整个绘图区：4PL 拟合后坐标轴重标定，小框可能圈不到点
    // 等 ChartPanel 的 flagging class：子组件 DOM 更新晚于其 watcher，
    // 该类出现即代表 syncBrush 已完成 brush 激活（避免竞态丢首笔）
    const flagBtn = page.getByRole('button', { name: 'Flag', exact: true })
    await flagBtn.click()
    await expect(page.getByTestId('chart-canvas')).toHaveClass(/chart-panel--flagging/)
    await lassoOnChart(page, [
      [0.08, 0.1],
      [0.92, 0.1],
      [0.92, 0.88],
      [0.08, 0.88],
    ])

    // comment 必填弹窗
    const flagDialog = page.getByRole('dialog', { name: 'Flag selected points' })
    await expect(flagDialog).toBeVisible({ timeout: 10_000 })
    await flagDialog.locator('textarea').fill('e2e outliers')
    await flagDialog.getByRole('button', { name: /^Flag \d+ 个点$/ }).click()

    // × 出现（打标计数）+ toast
    await expect(page.locator('.cview__flagcount')).toContainText('flagged')
    await expect(page.locator('.is-toast--success', { hasText: '已打标' })).toBeVisible()
    await expectNoErrorToast(page)
  })
})

test.describe('f) 六图种切换', () => {
  test('同一视图切 bar/line/scatter/box/pie/heatmap/bignumber 均能出图且无错误', async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await expect(page.getByRole('combobox', { name: 'Chart type' })).toBeVisible()

    // bar：x=species, y=sepal_length
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    await expectCanvasInk(page)

    const typeSelect = page.getByRole('combobox', { name: 'Chart type' })
    const emptyState = page.getByText('开始配置图表')

    // line（x=species / y=sepal_length 可复用）
    await pickOption(typeSelect, 'Line chart')
    await expectCanvasInk(page)
    await expectNoErrorToast(page)

    // scatter：X 换成数值列 sepal_width
    await pickOption(typeSelect, 'Scatter plot')
    const xSlot = page.locator('.mslot', { hasText: 'X Axis' })
    await xSlot.getByLabel('移除字段').click()
    await mapField(page, 'X Axis', 'sepal_width')
    await expectCanvasInk(page)
    await expectNoErrorToast(page)

    // box：Y 必填，缺失则补映射
    await pickOption(typeSelect, 'Box plot')
    if (await emptyState.isVisible()) {
      await mapField(page, 'Y Axis', 'sepal_length')
    }
    await expectCanvasInk(page)
    await expectNoErrorToast(page)

    // pie：Categories 必填，缺失则补
    await pickOption(typeSelect, 'Pie chart')
    if (await emptyState.isVisible()) {
      await mapField(page, 'Categories', 'species')
    }
    await expectCanvasInk(page)
    await expectNoErrorToast(page)

    // heatmap：X/Y/Color 全必填，缺失则补
    await pickOption(typeSelect, 'Heatmap')
    if (await emptyState.isVisible()) {
      await mapField(page, 'X（列坐标）', 'species')
      await mapField(page, 'Y（行坐标）', 'petal_width')
      await mapField(page, 'Color value', 'sepal_length')
    }
    await expectCanvasInk(page)
    await expectNoErrorToast(page)

    // bignumber：Categories → 每个类别一个大号数字
    await pickOption(typeSelect, 'Big number')
    if (await emptyState.isVisible()) {
      await mapField(page, 'Categories', 'species')
    }
    await expectCanvasInk(page)
    await expectNoErrorToast(page)
  })
})

test.describe('g) Big number 指标卡', () => {
  test('演示视图各阶段分子数：三类大号数字可见', async ({ page }) => {
    const { createProjectDemoAnalyses } = await import('../../src/shared/demoProjects')
    const showcase = createProjectDemoAnalyses().find((a) => a.id === 'demo-chart-features')
    expect(showcase).toBeTruthy()
    const res = await page.request.put(`/api/analyses/${encodeURIComponent(showcase!.id)}`, { data: showcase })
    expect(res.ok()).toBeTruthy()

    await page.goto(`/analysis/${showcase!.id}`)
    await expect(page.getByTestId('sidebar-table').first()).toBeVisible()
    await ensureWorkspace(page)

    await viewNode(page, '各阶段分子数').click()
    await expectCanvasInk(page)

    const plot = page.getByTestId('chart-canvas')
    await expect(plot).toContainText('开发中')
    await expect(plot).toContainText('评估中')
    await expect(plot).toContainText('CRO测试')
    // 演示数据：开发中 4、评估中 3、CRO测试 3
    await expect(plot).toContainText('4')
    await expect(plot.getByText('3').first()).toBeVisible()
    await expectNoErrorToast(page)
  })

  test('新建 Big number → 映射 Categories → 出图', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'bignumber')
    await expect(page.getByRole('combobox', { name: 'Chart type' })).toBeVisible()
    await mapField(page, 'Categories', 'species')
    await expectCanvasInk(page)
    await expect(page.getByTestId('chart-canvas')).toContainText('setosa')
    await expectNoErrorToast(page)
  })
})
