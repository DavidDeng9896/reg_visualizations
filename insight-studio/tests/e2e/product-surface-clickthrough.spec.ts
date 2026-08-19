import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import {
  createDemoAndEnter,
  createView,
  dragConnectToBlank,
  expectCanvasInk,
  flowNodeIdByName,
  importCsv,
  mapField,
  openFlowchart,
  pickOption,
  selectTable,
} from './helpers'

/**
 * 对正在运行的 Vite :7100 + Go :8787 + MariaDB 做产品面点击清单。
 * 选择器按当前 UI（看板「添加组件」按钮、AI 设置 Skills/MCP/记忆、流程图「节点预览」）。
 */

async function muteFabPointer(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '[data-testid="ai-fab"]{pointer-events:none !important}',
  })
}

test.describe('产品面点击清单（MariaDB 实机）', () => {
  test('首页：列表、搜索、筛选、新建、占位菜单', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('analysis-card').first()).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('快速搜索').fill('抗体')
    await expect(page.getByTestId('analysis-card').first()).toBeVisible()
    await page.getByLabel('快速搜索').fill('')
    await page.getByRole('combobox', { name: '按项目筛选' }).click()
    await page.getByRole('listbox').last().getByRole('option').first().click()

    await page.getByRole('button', { name: '化合物' }).click()
    await expect(page.getByText('为占位菜单')).toBeVisible()

    await page.getByRole('button', { name: '新建分析' }).click()
    const dlg = page.getByRole('dialog', { name: '新建分析' })
    await dlg.getByPlaceholder('例如：Binding assay analysis').fill('surface-home')
    await dlg.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)
    await expect(page.getByRole('button', { name: 'Workspace' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flowchart' })).toBeVisible()
  })

  test('看板：新建 → 添加表组件 → 外链 → 刷新后仍在 MariaDB', async ({ page }) => {
    await createDemoAndEnter(page)
    const analysisName = await page.locator('.side__crumb-current').innerText()

    await page.getByRole('tab', { name: '看板' }).click()
    await page.waitForURL(/\/dashboards/)
    await page.getByRole('button', { name: '新建看板' }).click()
    const create = page.getByRole('dialog', { name: '新建看板' })
    await create.getByRole('textbox').first().fill('surface-dash')
    await create.getByRole('button', { name: '创建' }).click()
    await expect(page.locator('.dash__name')).toHaveText('surface-dash')
    await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]{8,}/i)

    await page.locator('.dash__actions').getByRole('button', { name: '添加组件' }).click()
    const add = page.getByRole('dialog', { name: '添加组件' })
    await expect(add).toBeVisible()
    await expect(add.getByText('加载 Insight 列表…')).toHaveCount(0, { timeout: 15_000 })
    const insightSelect = add.getByRole('combobox', { name: '选择 Insight' })
    await expect(insightSelect).toBeVisible()
    await insightSelect.click()
    const opt = page.getByRole('listbox').last().getByRole('option').filter({ hasText: analysisName }).first()
    if (await opt.count()) await opt.click()
    else await page.getByRole('listbox').last().getByRole('option').first().click()
    await add.locator('[role="treeitem"]').filter({ hasText: 'Iris measurements' }).first().click()
    await add.getByRole('button', { name: '添加', exact: true }).click()
    await expect(page.getByText('已添加组件')).toBeVisible()
    await expect(page.locator('.dc__item')).toHaveCount(1, { timeout: 10_000 })

    await page.locator('.dash__actions').getByRole('button', { name: '添加组件' }).click()
    const add2 = page.getByRole('dialog', { name: '添加组件' })
    await add2.getByRole('tab', { name: '外部链接' }).click()
    await add2.getByPlaceholder('https://example.com/report').fill('https://example.com/sop')
    await add2.getByPlaceholder('例如：实验 SOP / 外部报表').fill('SOP')
    await add2.getByRole('button', { name: '添加', exact: true }).click()
    await expect(page.locator('.dc__item')).toHaveCount(2, { timeout: 10_000 })

    await page.getByRole('button', { name: '分类样式' }).click()
    await expect(page.getByLabel('分类样式')).toBeVisible()
    await expect(page.getByText('数据表')).toBeVisible()
    await page.getByRole('button', { name: '编辑布局' }).click()
    await expect(page.getByRole('button', { name: '完成布局' })).toBeVisible()

    await page.waitForTimeout(1200)
    await page.reload()
    await expect(page.locator('.dash__name')).toHaveText('surface-dash')
    await expect(page.locator('.dc__item')).toHaveCount(2, { timeout: 15_000 })
    const dashId = page.url().split('/dashboards/')[1]?.split(/[?#]/)[0]
    expect(dashId).toBeTruthy()
    const res = await page.request.get(`/api/dashboards/${encodeURIComponent(dashId)}`)
    expect(res.ok()).toBeTruthy()
    const doc = (await res.json()) as { widgets?: unknown[] }
    expect(doc.widgets?.length).toBe(2)
  })

  test('导入：CSV / Excel / SQL MariaDB / 本地已有表 / Combine', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    await page.getByRole('dialog', { name: /新建分析/ }).getByRole('textbox').first().fill('surface-import')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)
    const analysisId = page.url().split('/analysis/')[1]?.split(/[?#]/)[0]

    await importCsv(page, 'csv_left', 'id,value\na,1\nb,2')
    await importCsv(page, 'csv_right', 'id,label\na,Alpha\nb,Beta')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['well', 'v'], ['A1', 1]]), 's')
    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Import Excel' }).click()
    const excel = page.getByRole('dialog', { name: 'Import Excel' })
    await excel.getByLabel('选择 Excel 文件').setInputFiles({
      name: 's.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buf,
    })
    await excel.getByLabel('表名').fill('excel_s')
    await excel.getByRole('button', { name: 'Add table' }).click()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: 'excel_s' })).toBeVisible()

    await page.locator('button.side__add[aria-label="Add data"]').click()
    await page.getByRole('menuitem', { name: /Import from SQL/ }).click()
    const sql = page.getByRole('dialog', { name: 'Import from SQL' })
    await sql.getByRole('tab', { name: '本地已有表' }).click()
    await expect(sql.getByText('在浏览器内对当前 Analysis 已导入的表执行只读 SELECT')).toBeVisible()
    await sql.getByRole('tab', { name: '外部数据库' }).click()
    if (await sql.getByRole('button', { name: '新建连接' }).isVisible()) {
      await sql.getByRole('button', { name: '新建连接' }).click()
    }
    await sql.getByLabel('数据库类型').click()
    await page.getByRole('option', { name: 'MariaDB' }).click()
    await expect(sql.getByLabel('Port', { exact: true })).toHaveValue('3306')
    await sql.getByLabel('连接名称', { exact: true }).fill('surface-mdb')
    await sql.getByLabel('Host', { exact: true }).fill('127.0.0.1')
    await sql.getByLabel('Database', { exact: true }).fill('insight_demo')
    await sql.getByLabel('User', { exact: true }).fill('insight')
    await sql.getByLabel('Password', { exact: true }).fill('insight')
    await sql.getByRole('button', { name: '测试并保存' }).click()
    await expect(sql.locator('.sql__test-msg')).toContainText(/连接成功/, { timeout: 15_000 })
    await sql.getByRole('button', { name: '取消' }).click()

    await page.getByRole('button', { name: 'Add data' }).click()
    await page.getByRole('menuitem', { name: 'Combine tables' }).click()
    const comb = page.getByRole('dialog', { name: 'Combine tables' })
    await comb.getByRole('combobox').nth(0).click()
    await page.getByRole('listbox').last().getByRole('option', { name: 'csv_left', exact: true }).click()
    await comb.getByRole('combobox').nth(1).click()
    await page.getByRole('listbox').last().getByRole('option', { name: 'csv_right', exact: true }).click()
    await comb.getByRole('button', { name: 'Create table' }).click()
    await expect(page.locator('.is-toast--success', { hasText: '已创建合并表' })).toBeVisible()

    const res = await page.request.get(`/api/analyses/${analysisId}`)
    const doc = await res.json()
    expect((doc.tables ?? []).map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining(['csv_left', 'csv_right', 'excel_s']),
    )
  })

  test('表格：渲染、编辑、排序', async ({ page }) => {
    await muteFabPointer(page)
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await expect(page.getByTestId('grid-stats')).toHaveText('150 行')
    await page.getByTestId('enter-edit-btn').click()
    const cell = page.locator('.vxe-body--row').first().locator('.vxe-body--column').nth(1)
    await cell.dblclick()
    const input = page.locator('.dg__edit-input')
    await expect(input).toBeVisible()
    await input.fill('9.99')
    await input.press('Enter')
    await expect(cell).toHaveText('9.99')
    await page.getByRole('button', { name: '确认修改' }).click()
  })

  test('图表：创建 scatter → 保存 → 导出 PNG', async ({ page }) => {
    await muteFabPointer(page)
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'sepal_length')
    await mapField(page, 'Y Axis', 'sepal_width')
    await expectCanvasInk(page)
    await page.getByRole('button', { name: 'Save' }).click({ force: true })
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()
    await page.locator('.cview__stage').hover()
    await page.getByLabel('导出图表').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: '导出 PNG' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })

  test('转换：derived 列并提升为表', async ({ page }) => {
    await muteFabPointer(page)
    await createDemoAndEnter(page)
    await createView(page, 'Iris measurements', 'table')
    await page.getByRole('button', { name: 'Transform' }).click()
    await page.getByRole('menuitem', { name: 'Derived column' }).click()
    const dialog = page.getByRole('dialog', { name: '新建转换' })
    await dialog.getByPlaceholder('例如 ratio').fill('double_sl')
    await dialog.getByPlaceholder(/例如 sepal_length/).fill('sepal_length * 2')
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByRole('button', { name: '提升为表' })).toBeVisible()
    await page.getByRole('button', { name: '提升为表' }).click()
    await expect(page.getByTestId('sidebar-table').filter({ hasText: '(table)' })).toBeVisible()
  })

  test('流程图：表节点预览 + 图表节点预览（当前「节点预览」面板）', async ({ page }) => {
    await muteFabPointer(page)
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Bar chart')
    await mapField(page, 'X Axis', 'species')
    await mapField(page, 'Y Axis', 'sepal_length')
    await expectCanvasInk(page)
    await page.getByRole('button', { name: 'Save' }).click({ force: true })
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()

    await openFlowchart(page)
    const tableNode = page.locator('.vue-flow__node').filter({ hasText: 'Iris measurements' }).first()
    await tableNode.click({ force: true })
    const preview = page.getByRole('complementary', { name: '节点预览' })
    await expect(preview).toBeVisible()
    await expect(preview.locator('.sdp__preview-table, .sdp__preview-count, .sdp__preview-empty').first()).toBeVisible()

    await page.getByTestId('sidebar-view').filter({ hasText: 'Bar chart' }).last().click()
    await expect(page.getByRole('complementary', { name: '节点预览' })).toContainText(/Bar chart|柱状图|图表/)
    await expect(page.getByTestId('flow-chart-preview')).toBeVisible({ timeout: 15_000 })
  })

  test('流程图：从端口拖到空白 → Add step → Filter table', async ({ page }) => {
    await muteFabPointer(page)
    await page.goto('/')
    await page.getByRole('button', { name: '新建分析' }).click()
    await page.getByRole('dialog', { name: /新建分析/ }).getByRole('textbox').first().fill('surface-filter')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)
    await importCsv(page, 'samples', 'id,value\n1,10\n2,20\n3,30')
    await openFlowchart(page)
    await page.waitForTimeout(600)
    const id = await flowNodeIdByName(page, 'samples')
    await dragConnectToBlank(page, { nodeId: id, port: 'Output dataset' })
    await expect(page.locator('.add-step')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Filter table' }).click()
    const filterEdit = page.getByRole('complementary', { name: '编辑步骤' })
    await expect(filterEdit).toBeVisible({ timeout: 10_000 })
    await expect(filterEdit.getByRole('button', { name: 'Add filter group' })).toBeVisible()
    await expect(page.locator('.vue-flow__node').filter({ hasText: 'Filter table' })).toBeVisible()
  })

  test('AI：FAB、关闭抽屉、设置 模型/Skills 预览/MCP/记忆', async ({ page }) => {
    await createDemoAndEnter(page)
    await page.getByTestId('ai-fab').click()
    const drawer = page.getByTestId('ai-drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: '关闭' }).click()
    await expect(drawer).toBeHidden()

    await page.getByTestId('ai-fab').click()
    await expect(drawer).toBeVisible()
    await page.getByTestId('ai-settings').click()
    const settings = page.getByRole('dialog', { name: 'AI 设置' })
    await expect(settings).toBeVisible()
    await expect(settings.getByText('Base URL')).toBeVisible()

    await settings.getByRole('tab', { name: 'Skills' }).click()
    await expect(settings.getByText('Chart best practices', { exact: true })).toBeVisible({ timeout: 15_000 })
    await settings.getByRole('button', { name: '预览' }).first().click()
    await expect(settings.locator('.cap__preview-body')).toBeVisible()

    await settings.getByRole('tab', { name: 'MCP' }).click()
    await expect(settings.getByPlaceholder('如 Internal Docs MCP')).toBeVisible()
    await expect(settings.getByRole('button', { name: '添加连接' })).toBeVisible()

    await settings.getByRole('tab', { name: '记忆' }).click()
    await expect(settings.getByPlaceholder(/类别对比/)).toBeVisible()
    const memo = `e2e memory ${Date.now()}: prefer bar after aggregate`
    await settings.getByPlaceholder(/类别对比/).fill(memo)
    await settings.getByTestId('ai-memory-add').click()
    await expect(settings.getByText(memo).first()).toBeVisible()
  })

  test('绑定列删除后 Save 被阻断', async ({ page }) => {
    await muteFabPointer(page)
    await createDemoAndEnter(page)
    await selectTable(page, 'Iris measurements')
    await page.getByRole('button', { name: '创建图表' }).click()
    await pickOption(page.getByRole('combobox', { name: 'Chart type' }), 'Scatter plot')
    await mapField(page, 'X Axis', 'sepal_length')
    await mapField(page, 'Y Axis', 'sepal_width')
    await page.getByRole('button', { name: 'Save' }).click({ force: true })
    await expect(page.locator('.is-toast--success', { hasText: '图表配置已保存' })).toBeVisible()

    await selectTable(page, 'Iris measurements')
    await page.getByTestId('enter-edit-btn').click()
    await page.locator('.vxe-header--column', { hasText: 'sepal_length' }).first().hover()
    await page.getByLabel('sepal_length 列菜单').click()
    await page.getByRole('menuitem', { name: '删除列' }).click()
    await page.getByRole('dialog', { name: '删除列' }).getByRole('button', { name: '删除' }).click()
    await page.getByRole('button', { name: '确认修改' }).click()

    // 创建图表默认名叫 Bar chart，改 scatter 后侧栏名称不变
    await page.getByTestId('sidebar-view').filter({ hasText: 'Bar chart' }).first().click()
    await expect(page.locator('.cview__notice--missing')).toBeVisible()
    const openCfg = page.locator('.cview__open')
    if (await openCfg.isVisible()) await openCfg.click()
    await expect(page.locator('.mslot__capsule--missing').first()).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).evaluate((el: HTMLElement) => el.click())
    await expect(page.getByText(/无法保存/)).toBeVisible()
  })
})
