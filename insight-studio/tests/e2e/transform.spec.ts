import { test, expect } from '@playwright/test'
import { createDemoAndEnter, createView, selectTable } from './helpers'

test.describe('c) 转换：derived 列与提升为表', () => {
  test('新建视图 → derived 非法表达式标红阻断 → 改合法通过 → promote 为表', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'table')

    // 新视图 Table 1 被选中
    await expect(page.getByTestId('grid-stats')).toHaveText('150 行')

    // + Transform → Derived column
    await page.getByRole('button', { name: 'Transform' }).click()
    await page.getByRole('menuitem', { name: 'Derived column' }).click()
    const dialog = page.getByRole('dialog', { name: '新建转换' })
    await expect(dialog).toBeVisible()

    await dialog.getByPlaceholder('例如 ratio').fill('double_sl')
    const expr = dialog.getByPlaceholder(/例如 sepal_length/)

    // 非法表达式：标红 + Apply 阻断（弹窗仍在）
    await expr.fill('sepal_length ** 2')
    await expect(dialog.locator('.td__error').first()).toBeVisible()
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeVisible()

    // 改合法 → 通过
    await expr.fill('sepal_length * 2')
    await expect(dialog.locator('.td__error')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()

    // chip 出现 + 只读 banner（derived 改变列集）
    await expect(page.locator('.dg__ft .is-badge', { hasText: 'double_sl' })).toBeVisible()
    await expect(page.getByText('提升为表后可编辑')).toBeVisible()

    // 提升为表 → 新表出现在侧栏
    await page.getByRole('button', { name: '提升为表' }).click()
    await expect(page.getByTestId('sidebar-table')).toHaveCount(4)
    await expect(page.getByTestId('sidebar-table').filter({ hasText: '(table)' })).toBeVisible()
    // 新表可编辑（无只读 banner）
    await expect(page.getByText('提升为表后可编辑')).toHaveCount(0)
  })

  test('select 转换丢列后撤销恢复（防抖竞争不报错）', async ({ page }) => {
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'table')

    await page.getByRole('button', { name: 'Transform' }).click()
    await page.getByRole('menuitem', { name: 'Select columns' }).click()
    const dialog = page.getByRole('dialog', { name: '新建转换' })
    // 取消勾选 species（Keep 模式默认全选）
    await dialog.getByText('species', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()

    // species 列消失
    await expect(page.locator('.vxe-header--column', { hasText: 'species' })).toHaveCount(0)
    await page.keyboard.press('Control+z')
    await expect(page.locator('.vxe-header--column', { hasText: 'species' })).toHaveCount(1)
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })
})
