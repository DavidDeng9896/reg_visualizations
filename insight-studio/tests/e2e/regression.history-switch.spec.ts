import { expect, test } from '@playwright/test'
import { createDemoAndEnter, selectTable } from './helpers'

/**
 * 近期回归：分析切换不串数据 + AI 会话历史面板可见。
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
    /* ignore */
  }
}

test.describe('回归：分析切换 / AI 历史', () => {
  test('打开分析 A 选表后返回，再打开分析 B，不应残留 A 的表数据', async ({ page }) => {
    await wipeAnalyses(page)
    await page.goto('/')
    const cards = page.getByTestId('analysis-card')
    await expect(cards).toHaveCount(4)

    // A：抗体纯化
    await cards.filter({ hasText: '抗体纯化工艺分析' }).first().click()
    await page.waitForURL(/\/analysis\/demo-md-ab023/)
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Purification batches' })).toBeVisible()
    await selectTable(page, 'Purification batches')
    await expect(page.getByTestId('grid-stats')).toBeVisible()
    const statsA = await page.getByTestId('grid-stats').innerText()

    // 返回列表
    await page.goto('/')
    await expect(cards).toHaveCount(4)

    // B：亲和力筛选
    await cards.filter({ hasText: '抗体亲和力筛选分析' }).first().click()
    await page.waitForURL(/\/analysis\/demo-md-ab101/)
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'SPR kinetics' })).toBeVisible()
    // 不应仍显示 A 的表名
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'Purification batches' })).toHaveCount(0)

    await selectTable(page, 'SPR kinetics')
    await expect(page.getByTestId('grid-stats')).toBeVisible()
    const statsB = await page.getByTestId('grid-stats').innerText()
    expect(statsB).not.toEqual(statsA)
  })

  test('AI 会话历史面板可打开并列出会话', async ({ page }) => {
    // 预置一条会话
    const created = await page.request.post('/api/ai/conversations', {
      data: {
        title: 'e2e-history-probe',
        messages: [{ id: 'm1', role: 'user', content: 'hello history', trace: [], artifacts: [] }],
      },
    })
    expect(created.ok()).toBeTruthy()
    const doc = (await created.json()) as { id: string }

    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    await expect(page.getByTestId('ai-drawer')).toBeVisible()

    await page.getByTestId('ai-history').click()
    const panel = page.getByTestId('ai-history-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('e2e-history-probe')).toBeVisible()

    // 点进历史会话应看到消息
    await panel.getByText('e2e-history-probe').click()
    await expect(page.getByTestId('ai-history-panel')).toHaveCount(0)
    await expect(page.getByTestId('ai-messages')).toContainText('hello history')

    await page.request.delete(`/api/ai/conversations/${encodeURIComponent(doc.id)}`)
  })
})
