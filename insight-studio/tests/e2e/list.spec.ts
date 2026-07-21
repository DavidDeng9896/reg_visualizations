import { test, expect } from '@playwright/test'

test.describe('a) Analysis 列表页', () => {
  test('空态 → 新建 Analysis → 一键 Demo → 卡片出现且计数正确', async ({ page }) => {
    await page.goto('/')

    // 空态
    await expect(page.getByText('还没有 Analysis')).toBeVisible()
    await expect(page.getByTestId('analysis-card')).toHaveCount(0)

    // 新建空白 Analysis → 直达工作区
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    const createDialog = page.getByRole('dialog', { name: '新建 Analysis' })
    await createDialog.getByPlaceholder('例如：Binding assay analysis').fill('E2E blank analysis')
    await createDialog.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    // 回列表：一张卡片
    await page.goto('/')
    await expect(page.getByTestId('analysis-card')).toHaveCount(1)
    await expect(page.getByTestId('analysis-card').first()).toContainText('E2E blank analysis')
    await expect(page.getByTestId('analysis-card').first()).toContainText('0 张表 · 0 个视图')

    // 一键 Demo → 直达工作区（侧栏三张表）
    await page.getByRole('button', { name: '一键 Demo' }).first().click()
    await page.waitForURL(/\/analysis\//)
    await expect(page.getByTestId('sidebar-table')).toHaveCount(3)

    // 回列表：两张卡片，Demo 计数正确
    await page.goto('/')
    const cards = page.getByTestId('analysis-card')
    await expect(cards).toHaveCount(2)
    const demoCard = cards.filter({ hasText: 'Demo analysis' })
    await expect(demoCard).toContainText('3 张表 · 0 个视图')
  })

  test('Esc 关闭新建弹窗且焦点回到触发按钮', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'New analysis' }).first()
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '新建 Analysis' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
