import { test, expect } from '@playwright/test'

/**
 * HTTP 持久化下各 spec 共享服务端数据：本用例断言空态，
 * 需先清空分析列表（Dexie 模式下接口不可用，直接跳过）。
 */
async function wipeAnalyses(page: import('@playwright/test').Page): Promise<void> {
  try {
    const res = await page.request.get('/api/analyses')
    if (!res.ok()) return
    const list = (await res.json()) as { id: string }[]
    for (const a of list) {
      await page.request.delete(`/api/analyses/${encodeURIComponent(a.id)}`)
    }
  } catch {
    /* 非 HTTP 持久化环境：无需清理 */
  }
}

test.describe('a) Analysis 列表页', () => {
  test('空态 → 新建 Analysis → 一键 Demo → 卡片出现且计数正确', async ({ page }) => {
    await wipeAnalyses(page)
    await page.goto('/')

    // 空态
    await expect(page.getByText('还没有分析')).toBeVisible()
    await expect(page.getByTestId('analysis-card')).toHaveCount(0)

    // 新建空白 Analysis → 直达工作区
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    const createDialog = page.getByRole('dialog', { name: '新建 Analysis' })
    await createDialog.getByPlaceholder('例如：Binding assay analysis').fill('E2E blank analysis')
    await createDialog.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    // 回列表：一张卡片（显示默认项目/部门）
    await page.goto('/')
    await expect(page.getByTestId('analysis-card')).toHaveCount(1)
    await expect(page.getByTestId('analysis-card').first()).toContainText('E2E blank analysis')
    await expect(page.getByTestId('analysis-card').first()).toContainText('MD-AB023 · 抗体蛋白纯化')
    await expect(page.getByTestId('analysis-card').first()).toContainText('抗体发现部')

    // 一键 Demo → 直达工作区（侧栏三张表）
    await page.getByRole('button', { name: '一键 Demo' }).first().click()
    await page.waitForURL(/\/analysis\//)
    await expect(page.getByTestId('sidebar-table')).toHaveCount(3)

    // 回列表：两张卡片，Demo 显示其项目/部门
    await page.goto('/')
    const cards = page.getByTestId('analysis-card')
    await expect(cards).toHaveCount(2)
    const demoCard = cards.filter({ hasText: 'Demo analysis' })
    await expect(demoCard).toContainText('MD-BP310 · Bioprocess Media')
    await expect(demoCard).toContainText('生物分析部')
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
