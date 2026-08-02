import { expect, test, type Page } from '@playwright/test'
import { createDemoAndEnter } from './helpers'

/** 看板组件多选：勾选 → 操作条 → 键盘平移 → 批量删除 → Esc 取消。 */

async function createDashboard(page: Page, name: string): Promise<void> {
  await page.goto('/dashboards')
  await page.locator('button[aria-label="新建看板"]').click()
  const dialog = page.getByRole('dialog', { name: '新建看板' })
  await dialog.getByRole('textbox').fill(name)
  await dialog.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/dashboards\//)
}

async function addTableWidget(page: Page, _analysisName: string, tableName: string): Promise<void> {
  await page.locator('.dash__actions button').first().click()
  await page.getByRole('menuitem', { name: '添加组件' }).click()
  const dialog = page.getByRole('dialog', { name: '添加组件' })
  await dialog.getByRole('combobox').click()
  // 列表按更新时间倒序，第一项即本次 createDemoAndEnter 创建的 Demo analysis
  await page.getByRole('listbox').last().getByRole('option').first().click()
  await dialog.locator('[role="treeitem"]', { hasText: tableName }).first().click()
  await dialog.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByText('已添加组件')).toBeVisible()
}

test.describe('看板组件多选', () => {
  test('勾选两个组件 → 操作条计数 → 方向键平移 → 批量删除 → 清空', async ({ page }) => {
    await createDemoAndEnter(page)
    await createDashboard(page, '多选测试看板')
    await addTableWidget(page, 'Demo analysis', 'Iris measurements')
    await addTableWidget(page, 'Demo analysis', 'Plate 96 dose-response')
    await expect(page.locator('.dc__item')).toHaveCount(2, { timeout: 10_000 })

    // 勾选两个
    const items = page.locator('.dc__item')
    await items.nth(0).hover()
    await items.nth(0).locator('.dc__check').click()
    await items.nth(1).hover()
    await items.nth(1).locator('.dc__check').click()
    await expect(page.locator('.dc__actionbar')).toBeVisible()
    await expect(page.locator('.dc__actionbar-count')).toHaveText('已选 2 个组件')
    await expect(page.locator('.dc__item--selected')).toHaveCount(2)

    // 方向键上移：下方组件挤入上方组件位置（compact 模型下会推动布局变化）
    const topsBefore = await items.evaluateAll((els) => els.map((el) => el.style.top))
    await page.keyboard.press('ArrowUp')
    await expect
      .poll(async () => {
        const tops = await page.locator('.dc__item').evaluateAll((els) => els.map((el) => el.style.top))
        return tops.some((t, i) => t !== topsBefore[i])
      })
      .toBe(true)

    // 批量删除：确认弹窗 → 组件清空 + 操作条消失
    await page.locator('.dc__actionbar').getByRole('button', { name: '批量删除' }).click()
    await page.getByRole('dialog', { name: '批量删除组件' }).getByRole('button', { name: '删除' }).click()
    await expect(page.locator('.dc__item')).toHaveCount(0)
    await expect(page.locator('.dc__actionbar')).toHaveCount(0)
    await expect(page.getByText('已删除 2 个组件')).toBeVisible()
  })

  test('勾选后 Esc 取消选择；单选切换', async ({ page }) => {
    await createDemoAndEnter(page)
    await createDashboard(page, '多选测试看板 2')
    await addTableWidget(page, 'Demo analysis', 'Iris measurements')
    await expect(page.locator('.dc__item')).toHaveCount(1, { timeout: 10_000 })

    const item = page.locator('.dc__item').first()
    await item.hover()
    await item.locator('.dc__check').click()
    await expect(page.locator('.dc__actionbar-count')).toHaveText('已选 1 个组件')
    // 再点一次取消
    await item.locator('.dc__check').click()
    await expect(page.locator('.dc__actionbar')).toHaveCount(0)
    // 重新选中 → Esc 清空
    await item.locator('.dc__check').click()
    await expect(page.locator('.dc__actionbar-count')).toHaveText('已选 1 个组件')
    await page.keyboard.press('Escape')
    await expect(page.locator('.dc__actionbar')).toHaveCount(0)
  })
})
