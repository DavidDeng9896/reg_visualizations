import { expect, test, type Page } from '@playwright/test'
import { createDemoAndEnter, createView, expectCanvasInk, mapField, pickOption, selectTable } from './helpers'

/**
 * Prism 差距补齐能力的 UI 级验证：
 * 参考线 / 拟合注释 / AUC / 置信带 / 残差图 / 数据标签 / 100% 堆叠 / 小提琴图。
 * 断言直接读 Plotly graphDiv 的 data/layout，避开脆弱的 SVG 类名。
 */

const gd = (page: Page) => page.locator('.js-plotly-plot').first()
const gdData = (page: Page) =>
  gd(page).evaluate((el) => (el as unknown as { data: Array<Record<string, unknown>> }).data)
const gdLayout = (page: Page) =>
  gd(page).evaluate((el) => (el as unknown as { layout: Record<string, unknown> }).layout)

/** scatter + Linear 拟合就绪（Weight-length study，两组系列）。 */
async function setupScatterFit(page: Page): Promise<void> {
  await createDemoAndEnter(page)
  await createView(page, 'Weight-length study', 'scatter')
  await mapField(page, 'X Axis', 'weight_kg')
  await mapField(page, 'Y Axis', 'length_cm')
  await expectCanvasInk(page)
  await pickOption(page.getByRole('combobox', { name: '回归模型' }), 'Linear')
  await expectCanvasInk(page)
}

test.describe('Prism 差距补齐（UI）', () => {
  test('拟合注释：开关后注释块含方程与 R²；置信带渲染', async ({ page }) => {
    await setupScatterFit(page)

    // 默认无注释
    let layout = await gdLayout(page)
    expect((layout.annotations as unknown[] | undefined) ?? []).toHaveLength(0)
    // Linear 拟合 → 有 fill=tonexty 置信带（等重建完成再断言，避免时序抖动）
    await expect
      .poll(async () => (await gdData(page)).filter((t) => t.fill === 'tonexty').length)
      .toBeGreaterThan(0)

    // STYLE → 拟合注释开
    await page.getByRole('tab', { name: 'STYLE' }).click()
    await page.locator('[aria-label="显示方程与 R²"]').click()
    await expect
      .poll(async () => JSON.stringify((await gdLayout(page)).annotations ?? []))
      .toContain('R²=')
    layout = await gdLayout(page)
    const text = String((layout.annotations as Array<{ text: string }>)[0].text)
    expect(text).toContain('y =')
    expect(text).toContain('R²=')
  })

  test('参考线：STYLE 添加 Y 轴参考线 → shapes 出现对应虚线', async ({ page }) => {
    await setupScatterFit(page)
    await page.getByRole('tab', { name: 'STYLE' }).click()
    await page.getByText('添加参考线', { exact: true }).click()
    await page.locator('.sty__refline-value input').first().fill('100')
    await expect.poll(async () => ((await gdLayout(page)).shapes as unknown[] | undefined)?.length ?? 0).toBeGreaterThan(0)
    const layout = await gdLayout(page)
    const shapes = layout.shapes as Array<Record<string, unknown>>
    expect(shapes.some((s) => s.type === 'line' && s.y0 === 100 && s.yref === 'y')).toBe(true)
  })

  test('MODEL VARIABLES 含 AUC 行；RESIDUAL PLOT 渲染残差散点', async ({ page }) => {
    await setupScatterFit(page)

    // 展开 MODEL TABLES → MODEL VARIABLES 有 AUC
    await page.getByRole('tab', { name: 'MODEL VARIABLES' }).click()
    await expect(page.locator('.mtabs__table--vars')).toContainText('AUC')
    await expect(page.locator('.mtabs__table--vars')).toContainText('R²')

    // RESIDUAL PLOT：切 Tab 后 ChartPanel 渲染 Residual 散点 + 零参考线
    // （主图也在页面上，必须用 mtabs 容器内的 plot，不能取 .first()）
    await page.getByRole('tab', { name: 'RESIDUAL PLOT' }).click()
    const residualPlot = page.locator('.mtabs__residual .js-plotly-plot')
    await expect(residualPlot).toBeVisible()
    const data = await residualPlot.evaluate((el) => (el as unknown as { data: Array<Record<string, unknown>> }).data)
    expect(data.some((t) => t.name === 'Residual' && t.mode === 'markers')).toBe(true)
  })

  test('bar：100% 堆叠 + 数据标签', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'bar')
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Bar chart')
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    await expectCanvasInk(page)

    await page.getByRole('tab', { name: 'STYLE' }).click()
    await pickOption(page.getByRole('combobox', { name: '柱形模式' }), '100% 堆叠')
    await page.locator('[aria-label="显示柱值"]').click()
    await expect.poll(async () => (await gdLayout(page)).barmode).toBe('stack')

    const layout = await gdLayout(page)
    expect((layout.yaxis as { tickformat: string }).tickformat).toBe('.0%')
    const data = await gdData(page)
    expect((data[0].text as string[] | undefined)?.length).toBeGreaterThan(0)
    expect(String((data[0].text as string[])[0])).toContain('%')
  })

  test('box：切换小提琴形态 → violin trace', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'box')
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Box plot')
    await mapField(page, 'Y Axis', 'sepal_length')
    await mapField(page, 'X Axis Categories', 'species')
    await expectCanvasInk(page)

    await page.getByRole('tab', { name: 'STYLE' }).click()
    await pickOption(page.getByRole('combobox', { name: '形态' }), '小提琴图')
    await expect.poll(async () => (await gdData(page))[0].type).toBe('violin')
    const data = await gdData(page)
    expect(data[0].type).toBe('violin')
    expect(data[0].points).toBeTruthy()
  })
})
