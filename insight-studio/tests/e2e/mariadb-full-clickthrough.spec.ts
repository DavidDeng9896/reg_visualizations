import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'
import { createDemoAndEnter, importCsv, openFlowchart } from './helpers'

/**
 * 现有 e2e 未覆盖、但换库后必须点到的缺口：Excel 导入、SQL MariaDB 选项、AI FAB、本地 SQL。
 * 对已运行的 :7100 + Go MariaDB 栈执行。
 */
test.describe('MariaDB 实机缺口点击', () => {
  test('Excel 导入 → 侧栏有表 → 刷新后仍在（HTTP/MariaDB）', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    await page.getByRole('dialog', { name: /新建分析/ }).getByRole('textbox').fill('excel-live')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)
    const analysisId = page.url().split('/analysis/')[1]?.split(/[?#]/)[0]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['well', 'value'],
      ['A1', 1.1],
      ['M1', 2.2],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'assays')
    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Import Excel' }).click()
    const dlg = page.getByRole('dialog', { name: 'Import Excel' })
    await dlg.getByLabel('选择 Excel 文件').setInputFiles({
      name: 'assays.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buf,
    })
    await expect(dlg.getByLabel('表名')).toBeVisible()
    await dlg.getByLabel('表名').fill('excel_assays')
    await dlg.getByRole('button', { name: 'Add table' }).click()
    await expect(dlg).toBeHidden()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'excel_assays' })).toBeVisible()

    await page.waitForTimeout(800)
    const res = await page.request.get(`/api/analyses/${analysisId}`)
    expect(res.ok()).toBeTruthy()
    const doc = await res.json()
    const names = (doc.tables ?? []).map((t: { name: string }) => t.name)
    expect(names).toContain('excel_assays')
  })

  test('SQL 导入对话框列出 MariaDB，默认端口 3306，能连 insight_demo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    await page.getByRole('dialog', { name: /新建分析/ }).getByRole('textbox').fill('sql-mdb-opt')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    await page.locator('button.side__add[aria-label="Add data"]').click()
    await page.getByRole('menuitem', { name: /Import from SQL/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Import from SQL' })
    await expect(dlg).toBeVisible()
    await dlg.getByRole('tab', { name: '外部数据库' }).click()
    if (await dlg.getByRole('button', { name: '新建连接' }).isVisible()) {
      await dlg.getByRole('button', { name: '新建连接' }).click()
    }
    await dlg.getByLabel('数据库类型').click()
    await expect(page.getByRole('option', { name: 'MariaDB' })).toBeVisible()
    await page.getByRole('option', { name: 'MariaDB' }).click()
    await expect(dlg.getByLabel('Port', { exact: true })).toHaveValue('3306')

    await dlg.getByLabel('连接名称', { exact: true }).fill('live-mdb')
    await dlg.getByLabel('Host', { exact: true }).fill('127.0.0.1')
    await dlg.getByLabel('Database', { exact: true }).fill('insight_demo')
    await dlg.getByLabel('User', { exact: true }).fill('insight')
    await dlg.getByLabel('Password', { exact: true }).fill('insight')
    await dlg.getByRole('button', { name: '测试并保存' }).click()
    await expect(dlg.locator('.sql__test-msg')).toContainText(/连接成功/, { timeout: 15_000 })
    await expect(dlg.locator('.sql__test-msg')).toContainText(/MariaDB/)
  })

  test('AI FAB 打开助手；设置里 Skills 列出官方 Skill', async ({ page }) => {
    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    await expect(page.getByTestId('ai-drawer')).toBeVisible()
    await page.getByTestId('ai-settings').click()
    const settings = page.getByRole('dialog', { name: 'AI 设置' })
    await expect(settings).toBeVisible()
    await settings.getByRole('tab', { name: 'Skills' }).click()
    await expect(settings.getByText('Chart best practices', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('CSV + Combine + 流程图节点在 MariaDB 刷新后仍在', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    await page.getByRole('dialog', { name: /新建分析/ }).getByRole('textbox').fill('combine-live')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)
    const analysisId = page.url().split('/analysis/')[1]?.split(/[?#]/)[0]

    await importCsv(page, 'left', 'id,value\na,1\nb,2')
    await importCsv(page, 'right', 'id,label\na,Alpha\nb,Beta')
    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Combine tables' }).click()
    const dialog = page.getByRole('dialog', { name: 'Combine tables' })
    await dialog.getByRole('combobox').nth(0).click()
    await page.getByRole('listbox').last().getByRole('option', { name: 'left', exact: true }).click()
    await dialog.getByRole('combobox').nth(1).click()
    await page.getByRole('listbox').last().getByRole('option', { name: 'right', exact: true }).click()
    await dialog.getByRole('button', { name: 'Create table' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '已创建合并表' })).toBeVisible()

    await openFlowchart(page)
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Join tables/i })).toBeVisible()
    await page.waitForTimeout(800)
    await page.reload()
    await openFlowchart(page)
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Join tables/i })).toBeVisible()

    const res = await page.request.get(`/api/analyses/${analysisId}`)
    const doc = await res.json()
    expect((doc.tables ?? []).length).toBeGreaterThanOrEqual(3)
  })
})
