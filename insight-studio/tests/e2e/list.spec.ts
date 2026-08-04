import { test, expect } from '@playwright/test'
import { createDemoAnalysis } from '../../src/shared/seed'

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
  test('空库自动补种示例 → 新建 Analysis → Demo → 卡片计数与项目/部门正确', async ({ page }) => {
    await wipeAnalyses(page)
    await page.goto('/')

    // 空库自动补种 4 个项目示例分析（ensureProjectDemoSeed，AppShell 启动时触发）
    const cards = page.getByTestId('analysis-card')
    await expect(cards).toHaveCount(4)
    await expect(cards.filter({ hasText: '抗体纯化工艺分析' })).toHaveCount(1)
    // 有数据时不展示主区缺省引导
    await expect(page.getByText('选择或新建分析')).toHaveCount(0)

    // 侧栏新建空白 Analysis → 直达工作区（默认流程图）
    await page.getByRole('button', { name: '新建分析' }).click()
    const createDialog = page.getByRole('dialog', { name: '新建分析' })
    await createDialog.getByPlaceholder('例如：Binding assay analysis').fill('E2E blank analysis')
    await createDialog.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    // 回列表：4 示例 + 1 新建（显示默认项目/部门）
    await page.goto('/')
    await expect(cards).toHaveCount(5)
    const blankCard = cards.filter({ hasText: 'E2E blank analysis' }).first()
    await expect(blankCard).toContainText('MD-AB023 · 抗体蛋白纯化')
    await expect(blankCard).toContainText('抗体发现部')

    // 写入 Iris Demo（有数据时主区不再展示「一键 Demo」）
    const demo = createDemoAnalysis()
    const put = await page.request.put(`/api/analyses/${encodeURIComponent(demo.id)}`, { data: demo })
    expect(put.ok()).toBeTruthy()
    await page.goto(`/analysis/${demo.id}`)
    await expect(page.getByTestId('sidebar-table')).toHaveCount(3)

    // 回列表：6 张卡片，Demo 显示其项目/部门
    await page.goto('/')
    await expect(cards).toHaveCount(6)
    const demoCard = cards.filter({ hasText: 'Demo analysis' })
    await expect(demoCard).toContainText('MD-BP310 · Bioprocess Media')
    await expect(demoCard).toContainText('生物分析部')
  })

  test('Esc 关闭新建弹窗且焦点回到触发按钮', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: '新建分析' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '新建分析' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
