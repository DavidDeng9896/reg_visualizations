import { expect, test } from '@playwright/test'
import { createView, dragConnect, dragConnectToBlank, expectCanvasInk, flowNodeIdByName, importCsv, pickOption, selectTable } from './helpers'

/** 流程图步骤化主流程：CSV 导入 / Combine 对话框均生成 StepNode，刷新后持久保留。 */
test.describe('步骤化主流程', () => {
  test('Import CSV 创建 upload-csv 步骤节点', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    await page.getByRole('textbox', { name: '例如：Binding assay analysis' }).fill('Step test')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    await importCsv(page, 'samples', 'id,value\na,1\nb,2')

    await page.getByRole('button', { name: 'Flowchart' }).click()
    const node = page.locator('.vue-flow__node').filter({ hasText: /Upload CSV/i }).first()
    await expect(node).toBeVisible()
    await expect(node).toContainText('samples')
    await expect(node).toContainText('2 行')
  })

  test('Combine tables 创建 join 步骤节点并连线', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    await page.getByRole('textbox', { name: '例如：Binding assay analysis' }).fill('Join test')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

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
    await expect(dialog).toBeHidden()
    await expect(page.locator('.is-toast--success')).toContainText('已创建合并表')

    await page.getByRole('button', { name: 'Flowchart' }).click()
    const joinNode = page.locator('.vue-flow__node').filter({ hasText: /Join tables/i }).first()
    await expect(joinNode).toBeVisible()
    await expect(joinNode).toContainText('2 行')

    // 两条输入边
    const edges = page.locator('.vue-flow__edge')
    await expect(edges).toHaveCount(2)

    // 刷新后仍保留
    await page.reload()
    await page.getByRole('button', { name: 'Flowchart' }).click()
    await expect(page.locator('.vue-flow__node').filter({ hasText: /Join tables/i }).first()).toBeVisible()
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2)
  })

  test('拖线搭建 Filter → Join 管道并创建图表', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    await page.getByRole('textbox', { name: '例如：Binding assay analysis' }).fill('Pipeline test')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    const leftCsv = ['id,x', ...Array.from({ length: 30 }, (_, i) => `${i + 1},${i + 1}`)].join('\n')
    const rightCsv = ['id,y', ...Array.from({ length: 30 }, (_, i) => `${i + 1},${(i + 1) * 2}`)].join('\n')
    await importCsv(page, 'left', leftCsv)
    await importCsv(page, 'right', rightCsv)

    await page.getByRole('button', { name: 'Flowchart' }).click()
    // 等画布挂载与 handleBounds 注册完成
    await page.waitForTimeout(600)

    const leftId = await flowNodeIdByName(page, 'left')
    const rightId = await flowNodeIdByName(page, 'right')

    // 1) 从 left 输出拖线到空白 → 添加 Filter table
    await dragConnectToBlank(page, { nodeId: leftId, port: 'Output dataset' })
    await expect(page.locator('.add-step')).toBeVisible()
    await page.getByRole('button', { name: 'Filter table' }).click()
    await expect(page.locator('.step-panel')).toBeVisible()

    // 配置过滤条件 id ≥ 2（保留 3 行）
    await page.getByRole('button', { name: 'Add filter group' }).click()
    const filterCond = page.locator('.scf__cond').first()
    await pickOption(filterCond.getByRole('combobox', { name: 'Filter column' }), 'id')
    await pickOption(filterCond.getByRole('combobox', { name: 'Filter operator' }), '≥')
    await filterCond.getByRole('textbox', { name: 'Filter value' }).fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.step-panel')).toBeHidden()

    // 2) 从 right 输出拖线到空白 → 添加 Join tables（自动接到 Left table 输入）
    await dragConnectToBlank(page, { nodeId: rightId, port: 'Output dataset' })
    await expect(page.locator('.add-step')).toBeVisible()
    await page.getByRole('button', { name: 'Join tables' }).click()
    await expect(page.locator('.step-panel')).toBeVisible()

    // 适应视图（面板打开时会为面板预留右侧空间），再拖第二根线
    await page.getByRole('button', { name: '适应视图' }).click()
    await page.waitForTimeout(600)

    // 3) 从 Filter 输出拖到 Join 的 Right table 输入（不关闭配置面板，Escape 会撤销新建步骤）
    const filterId = await flowNodeIdByName(page, 'Filter table')
    const joinId = await flowNodeIdByName(page, 'Join tables')
    await dragConnect(
      page,
      { nodeId: filterId, port: 'Output dataset' },
      { nodeId: joinId, port: 'Right table' },
      { closePanels: false },
    )
    // 连线成功应产生 3 条边：left→Filter、right→Join Left、Filter→Join Right
    await expect(page.locator('.vue-flow__edge')).toHaveCount(3)

    // 配置：inner join + key id = id，然后保存
    await page.getByRole('button', { name: 'Inner', exact: true }).click()
    await page.getByRole('button', { name: 'Add key' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.step-panel')).toBeHidden()

    // inner join（right ⋈ filter on id）应只剩 id=2..30 共 29 行
    const joinNode = page.locator('.vue-flow__node').filter({ hasText: /Join tables/i }).first()
    await expect(joinNode).toContainText('29 行')

    // 4) 在 Join tables 输出上创建 scatter 视图
    await createView(page, 'Join tables', 'scatter')
    await pickOption(page.getByRole('combobox', { name: 'X Axis' }), 'x')
    await pickOption(page.getByRole('combobox', { name: 'Y Axis' }), 'y')
    await page.getByRole('button', { name: 'Save' }).click()
    await expectCanvasInk(page)
  })

  test('编辑源表 → 下游步骤变 stale → Run all 恢复 configured', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'New analysis' }).first().click()
    await page.getByRole('textbox', { name: '例如：Binding assay analysis' }).fill('Stale test')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForURL(/\/analysis\//)

    await importCsv(page, 'left', 'id,x\n1,10\n2,20\n3,30')

    // 拖线加 Filter：id ≥ 2
    await page.getByRole('button', { name: 'Flowchart' }).click()
    await page.waitForTimeout(600)
    const leftId = await flowNodeIdByName(page, 'left')
    await dragConnectToBlank(page, { nodeId: leftId, port: 'Output dataset' })
    await page.getByRole('button', { name: 'Filter table' }).click()
    await expect(page.locator('.step-panel')).toBeVisible()
    await page.getByRole('button', { name: 'Add filter group' }).click()
    const cond = page.locator('.scf__cond').first()
    await pickOption(cond.getByRole('combobox', { name: 'Filter column' }), 'id')
    await pickOption(cond.getByRole('combobox', { name: 'Filter operator' }), '≥')
    await cond.getByRole('textbox', { name: 'Filter value' }).fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.step-panel')).toBeHidden()
    // Filter 产出应为 2 行
    const filterNode = page.locator('.vue-flow__node').filter({ hasText: /Filter table/i }).first()
    await expect(filterNode).toContainText('2 行')

    // 编辑源表 left：把 id=2 改为 0，使其不再满足 id ≥ 2
    await selectTable(page, 'left')
    const cell = page.locator('.vxe-body--row').nth(1).locator('.vxe-body--column').nth(1)
    await cell.dblclick()
    const input = page.locator('.dg__edit-input')
    await expect(input).toBeVisible()
    await input.fill('0')
    await input.press('Enter')

    // 回到流程图：Filter 应变 stale，并出现 Run all 按钮
    await page.getByRole('button', { name: 'Flowchart' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('.flow-node__status--stale').first()).toBeVisible()
    const runBtn = page.getByRole('button', { name: '重新运行' })
    await expect(runBtn).toBeVisible()

    // Run all：恢复 configured，stale 图标消失，输出按新数据重算为 1 行（仅 id=3）
    await runBtn.click()
    await expect(page.locator('.flow-node__status--stale')).toHaveCount(0)
    await expect(filterNode).toContainText('1 行')
  })
})
