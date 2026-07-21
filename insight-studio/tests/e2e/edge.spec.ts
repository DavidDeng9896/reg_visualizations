import { test, expect, type Page } from '@playwright/test'
import {
  createDemoAndEnter,
  expectCanvasInk,
  importCsv,
  makeCsv,
  mapField,
  pickOption,
  selectTable,
  tableNode,
} from './helpers'

/** Add data → Import CSV 并用给定文本上传（不点确认，供错误分支断言）。 */
async function uploadCsvText(page: Page, name: string, text: string) {
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('选择 CSV 文件').setInputFiles({
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from(text, 'utf-8'),
  })
  return dialog
}

test.describe('边界：CSV 导入', () => {
  test('空 CSV 与只有表头的 CSV 被阻止并提示', async ({ page }) => {
    await createDemoAndEnter(page)
    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Import CSV' }).click()

    // 空文件
    let dialog = await uploadCsvText(page, 'empty.csv', '')
    await expect(dialog.locator('.csv__error')).toHaveText('文件为空')
    await expect(dialog.getByRole('button', { name: 'Add table' })).toBeDisabled()

    // 只有表头
    dialog = await uploadCsvText(page, 'header-only.csv', 'a,b,c\n')
    await expect(dialog.locator('.csv__error')).toHaveText('文件只有表头，没有数据行')
    await expect(dialog.getByRole('button', { name: 'Add table' })).toBeDisabled()
  })

  test('单列 CSV 导入成功', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'single-col', 'name\nalpha\nbeta\ngamma')
    await expect(page.getByTestId('grid-stats')).toHaveText('3 行')
    await expect(page.locator('.vxe-header--column', { hasText: 'name' })).toHaveCount(1)
  })

  test('全空列按 string 导入且正常渲染', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'empty-col', 'a,b\n1,\n2,\n3,')
    await expect(page.getByTestId('grid-stats')).toHaveText('3 行')
    await expect(page.locator('.vxe-header--column', { hasText: 'b' })).toHaveCount(1)
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })
})

test.describe('边界：图表数据', () => {
  test('Pie 负值剔除提示', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'neg-pie', 'cat,val\nA,10\nB,-5\nC,20')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Pie chart')
    await mapField(page, 'Categories', 'cat')
    await mapField(page, 'Measure', 'val')
    await expect(page.locator('.cview__notice--warn', { hasText: '已剔除 1 个负值扇区' })).toBeVisible()
    await expectCanvasInk(page)
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })

  test('Log 轴遇到 ≤0 值：警告并回退 Linear', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'log-axis', 'x,y\n-1,2\n0,3\n5,4')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'x')
    await mapField(page, 'Y Axis', 'y')
    // 仅 3 个数据点，墨迹少，用小阈值
    await expectCanvasInk(page, 20)

    await page.getByRole('tab', { name: 'STYLE' }).click()
    await page.locator('section.axis-sec', { hasText: 'X-Axis' }).getByRole('switch').click()
    await expect(page.locator('.cview__notice--warn', { hasText: 'Log 轴已回退' })).toBeVisible()
    // 回退后仍能出图
    await expectCanvasInk(page, 20)
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })

  test('10001 行视图：采样警告条出现且图表 3s 内渲染', async ({ page }) => {
    await createDemoAndEnter(page)
    await importCsv(page, 'big-10001', makeCsv(10001))
    await expect(page.getByTestId('grid-stats')).toHaveText('10001 行')
    // 表格侧采样横幅
    await expect(
      page.locator('.dg__banner--warn', { hasText: 'Showing a random sample of 10,000 rows out of 10,001' }),
    ).toBeVisible()

    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'x')
    await mapField(page, 'Y Axis', 'y')

    const t0 = Date.now()
    await expectCanvasInk(page, 40, 30_000)
    const elapsed = Date.now() - t0
    console.log(`[perf] 10001 行采样 scatter 渲染耗时: ${elapsed}ms`)
    expect(elapsed).toBeLessThanOrEqual(3000)

    // 图表侧采样警告条
    await expect(page.locator('.cview__notice--sample', { hasText: 'random sample' })).toBeVisible()
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })

  test('拟合边界：单行数据 / 全同 x → 警告不画线不崩', async ({ page }) => {
    await createDemoAndEnter(page)

    // 单行数据
    await importCsv(page, 'one-row', 'x,y\n1,2')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'x')
    await mapField(page, 'Y Axis', 'y')
    await pickOption(page.getByRole('combobox', { name: '回归模型' }), 'Linear')
    await expect(page.locator('.cview__notice--warn', { hasText: '至少需要 2 个数据点' })).toBeVisible()
    await expect(page.locator('.is-toast--error')).toHaveCount(0)

    // 全同 x（无方差）
    await importCsv(page, 'same-x', 'x,y\n5,1\n5,2\n5,3')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'x')
    await mapField(page, 'Y Axis', 'y')
    await pickOption(page.getByRole('combobox', { name: '回归模型' }), 'Linear')
    await expect(page.locator('.cview__notice--warn', { hasText: 'X 无方差' })).toBeVisible()
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })
})

test.describe('边界：依赖与绑定', () => {
  test('删除被 combine 依赖的表 → 阻止并列出依赖', async ({ page }) => {
    await createDemoAndEnter(page)

    // Combine：Iris + Plate（Append）
    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Combine tables' }).click()
    const dialog = page.getByRole('dialog', { name: 'Combine tables' })
    await pickOption(dialog.getByRole('combobox').nth(0), 'Iris measurements')
    await pickOption(dialog.getByRole('combobox').nth(1), 'Plate 96 dose-response')
    await dialog.getByRole('radio', { name: 'Append' }).click()
    await dialog.getByRole('button', { name: 'Create table' }).click()
    await expect(page.getByTestId('sidebar-table')).toHaveCount(4)

    // 删除 Iris → 被阻止 + 提示列出依赖
    const iris = tableNode(page, 'Iris measurements')
    await iris.hover()
    await iris.getByLabel('更多操作').click()
    await page.getByRole('menuitem', { name: '删除' }).click()
    await expect(page.locator('.is-toast--error', { hasText: '无法删除' })).toBeVisible()
    // 表仍在
    await expect(tableNode(page, 'Iris measurements')).toBeVisible()
    await expect(page.getByTestId('sidebar-table')).toHaveCount(4)
  })

  test('绑定列被删除 → 槽位标红 + Save 阻断', async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'sepal_length')
    await mapField(page, 'Y Axis', 'sepal_width')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()

    // 回源表删除绑定列 sepal_length
    await selectTable(page, 'Iris measurements')
    await page.locator('.vxe-header--column', { hasText: 'sepal_length' }).first().hover()
    await page.getByLabel('sepal_length 列菜单').click()
    await page.getByRole('menuitem', { name: '删除列' }).click()
    await page.getByRole('dialog', { name: '删除列' }).getByRole('button', { name: '删除' }).click()

    // 回到图表视图：缺失警告条
    await page.getByTestId('sidebar-view').filter({ hasText: 'Bar chart' }).first().click()
    await expect(page.locator('.cview__notice--missing', { hasText: '请打开配置面板重新绑定' })).toBeVisible()

    // 打开面板：槽位胶囊标红 + Save 被阻断
    await page.locator('.cview__open').click()
    await expect(page.locator('.mslot__capsule--missing').first()).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.is-toast--error', { hasText: '无法保存' })).toBeVisible()
  })
})

test.describe('边界：快速连续切换（防抖竞争）', () => {
  test('快速切换视图与图种不报错、最终状态一致', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    // 保存以免 dirty 守卫弹窗干扰切换
    await page.getByRole('button', { name: 'Save' }).click()

    // 快速切换图种（150ms 防抖内连击）
    const typeSelect = page.getByRole('combobox', { name: 'Chart type' })
    for (const t of ['Line chart', 'Scatter plot', 'Bar chart', 'Line chart']) {
      await pickOption(typeSelect, t)
      await page.waitForTimeout(40)
    }

    // 快速在 表 ↔ 视图 间切换（有未保存修改 → 守卫弹窗出现即放弃）
    for (let i = 0; i < 4; i += 1) {
      await tableNode(page, 'Iris measurements').click()
      await page.getByTestId('sidebar-view').filter({ hasText: 'Bar chart' }).first().click()
      const guard = page.getByRole('dialog', { name: '未保存的图表修改' })
      if (await guard.isVisible()) {
        await guard.getByRole('button', { name: '放弃修改' }).click()
      }
    }

    // 最终状态：无页面错误、无 error toast、网格或图表正常
    expect(pageErrors).toEqual([])
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
    await expect(page.getByTestId('grid-stats')).toBeVisible()
  })
})
