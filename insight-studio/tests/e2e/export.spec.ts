import { test, expect } from '@playwright/test'
import { createDemoAndEnter, expectCanvasInk, mapField, selectTable } from './helpers'

test.describe('i) 导出', () => {
  test('悬停导出菜单 → 点 PNG 触发 download', async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    await expectCanvasInk(page)

    // 悬停图表区 → 导出按钮出现
    await page.locator('.cview__stage').hover()
    await page.getByLabel('导出图表').click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: '导出 PNG' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.png$/)
    await expect(page.locator('.is-toast--error')).toHaveCount(0)
  })

  test('点 PDF 触发 download', async ({ page }) => {
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    await expectCanvasInk(page)

    await page.locator('.cview__stage').hover()
    await page.getByLabel('导出图表').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: '导出 PDF' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })
})
