import { test, expect } from '@playwright/test'
import { createDemoAndEnter, expectCanvasInk, importCsv, makeCsv, mapField, pickOption } from './helpers'

test.describe('性能：大表与大图', () => {
  test('5 万行 CSV：导入 → 虚拟滚动生效 → 视图过滤响应', async ({ page }) => {
    await createDemoAndEnter(page)

    const tImport = Date.now()
    await importCsv(page, 'big-50k', makeCsv(50000))
    await expect(page.getByTestId('grid-stats')).toHaveText('50000 行')
    console.log(`[perf] 5 万行 CSV 导入+建表: ${Date.now() - tImport}ms`)

    // 虚拟滚动：DOM 行数远小于 50000（gt:500 阈值开启）
    const domRows = await page.locator('.vxe-body--row').count()
    console.log(`[perf] 5 万行表格 DOM 渲染行数: ${domRows}`)
    expect(domRows).toBeLessThan(120)

    // 滚动不报错
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    const grid = page.locator('.vxe-table--body-wrapper').first()
    await grid.hover()
    for (let i = 0; i < 10; i += 1) await page.mouse.wheel(0, 600)
    await page.waitForTimeout(300)
    expect(pageErrors).toEqual([])

    // 视图过滤响应：x > 40000 → 10000 / 50000 行
    await page.getByRole('button', { name: 'Add filter' }).click()
    const dialog = page.getByRole('dialog', { name: '新建过滤' })
    await pickOption(dialog.getByRole('combobox').nth(0), 'x')
    await pickOption(dialog.getByRole('combobox').nth(1), '>')
    await dialog.getByPlaceholder('值').fill('40000')
    const t0 = Date.now()
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByTestId('grid-stats')).toHaveText('10000 / 50000 行（已过滤）')
    const filterMs = Date.now() - t0
    console.log(`[perf] 5 万行过滤应用耗时(含 UI): ${filterMs}ms`)
    // E2E 含渲染与通信开销，阈值放宽到 3s；纯管道耗时在单测/手测中验证 <300ms
    expect(filterMs).toBeLessThan(3000)
  })

  test('5000 点 scatter 渲染 ≤3s；配置面板输入防抖不丢字', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'scatter-5k', makeCsv(5000))
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'x')
    await mapField(page, 'Y Axis', 'y')

    const t0 = Date.now()
    await expectCanvasInk(page)
    const renderMs = Date.now() - t0
    console.log(`[perf] 5000 点 scatter 渲染耗时: ${renderMs}ms`)
    expect(renderMs).toBeLessThanOrEqual(3000)

    // 面板输入防抖（150ms 预览重建）下不丢字
    await page.getByRole('tab', { name: 'STYLE' }).click()
    const titleInput = page
      .locator('.sty__row')
      .filter({ has: page.locator('.sty__label', { hasText: /^Title$/ }) })
      .locator('input')
    await titleInput.pressSequentially('性能测试 abc123', { delay: 30 })
    await expect(titleInput).toHaveValue('性能测试 abc123')
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })
})
