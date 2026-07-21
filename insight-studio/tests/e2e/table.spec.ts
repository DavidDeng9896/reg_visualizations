import { test, expect } from '@playwright/test'
import { createDemoAndEnter, pickOption, selectTable } from './helpers'

test.describe('b) 表格：渲染 / 编辑 / 排序 / 过滤', () => {
  test.beforeEach(async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
  })

  const firstDataCell = (page: import('@playwright/test').Page) =>
    page.locator('.vxe-body--row').first().locator('.vxe-body--column').nth(1)

  test('iris 表渲染 150 行', async ({ page }) => {
    await expect(page.getByTestId('grid-stats')).toHaveText('150 行')
    // 行数 < 虚拟滚动阈值，应全部渲染
    await expect(page.locator('.vxe-body--row')).toHaveCount(150)
  })

  test('双击改单元格 → Ctrl+Z 撤销恢复', async ({ page }) => {
    const cell = firstDataCell(page)
    const original = (await cell.innerText()).trim()
    expect(original.length).toBeGreaterThan(0)

    await cell.dblclick()
    const input = page.locator('.dg__edit-input')
    await expect(input).toBeVisible()
    await input.fill('9.99')
    await input.press('Enter')
    await expect(cell).toHaveText('9.99')

    await page.keyboard.press('Control+z')
    await expect(cell).toHaveText(original)

    // 重做
    await page.keyboard.press('Control+Shift+z')
    await expect(cell).toHaveText('9.99')
  })

  test('列排序：升序后首行值变化且表头出现排序图标', async ({ page }) => {
    const cell = firstDataCell(page)
    const before = (await cell.innerText()).trim()

    await page.locator('.vxe-header--column', { hasText: 'sepal_length' }).first().hover()
    await page.getByLabel('sepal_length 列菜单').click()
    await page.getByRole('menuitem', { name: '升序' }).click()

    await expect(page.locator('.dg__th-sort').first()).toBeVisible()
    const after = (await cell.innerText()).trim()
    expect(after).not.toBe(before)

    // 清除排序恢复
    await page.locator('.vxe-header--column', { hasText: 'sepal_length' }).first().hover()
    await page.getByLabel('sepal_length 列菜单').click()
    await page.getByRole('menuitem', { name: '清除排序' }).click()
    await expect(cell).toHaveText(before)
  })

  test('Add filter（petal_length > 5）→ 行数变少 + chip → 撤销恢复', async ({ page }) => {
    await page.getByRole('button', { name: 'Add filter' }).click()
    const dialog = page.getByRole('dialog', { name: '新建过滤' })
    await expect(dialog).toBeVisible()

    // 列 = petal_length，操作符 = >，值 = 5
    await pickOption(dialog.getByRole('combobox').nth(0), 'petal_length')
    await pickOption(dialog.getByRole('combobox').nth(1), '>')
    await dialog.getByPlaceholder('值').fill('5')
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()

    // 行数变少 + chip 出现
    await expect(page.getByTestId('grid-stats')).toContainText('/ 150 行（已过滤）')
    const chip = page.locator('.dg__ft .is-badge', { hasText: 'petal_length > 5' })
    await expect(chip).toBeVisible()
    const stats = await page.getByTestId('grid-stats').innerText()
    const shown = Number(stats.split('/')[0].trim())
    expect(shown).toBeGreaterThan(0)
    expect(shown).toBeLessThan(150)

    // 撤销过滤 → 恢复 150 行、chip 消失
    await page.keyboard.press('Control+z')
    await expect(page.getByTestId('grid-stats')).toHaveText('150 行')
    await expect(chip).toHaveCount(0)
  })
})
