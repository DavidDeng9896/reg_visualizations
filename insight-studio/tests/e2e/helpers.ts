import { expect, type Locator, type Page } from '@playwright/test'

/* ------------------------------- 通用动作 ------------------------------- */

/** 列表页 → 一键 Demo → 进入工作区（侧栏三张表就绪）。 */
export async function createDemoAndEnter(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '一键 Demo' }).first().click()
  await page.waitForURL(/\/analysis\//)
  await expect(page.getByTestId('sidebar-table').first()).toBeVisible()
}

/** 侧栏选择表，等待表格统计出现。 */
export function tableNode(page: Page, name: string): Locator {
  return page.getByTestId('sidebar-table').filter({ hasText: name }).first()
}

export async function selectTable(page: Page, name: string): Promise<void> {
  await tableNode(page, name).click()
  await expect(page.getByTestId('grid-stats')).toBeVisible()
}

/** 侧栏选择视图。 */
export function viewNode(page: Page, name: string): Locator {
  return page.getByTestId('sidebar-view').filter({ hasText: name }).first()
}

/** 在指定表上新建视图（picker tiles）。 */
export async function createView(page: Page, tableName: string, type: 'table' | 'bar' | 'line' | 'scatter' | 'box' | 'pie' | 'heatmap'): Promise<void> {
  const row = tableNode(page, tableName)
  await row.hover()
  await row.getByLabel('新建视图').click()
  await page.getByTestId(`picker-${type}`).click()
}

/** 手写 ISelect：点开 combobox 并选择选项（限定最后打开的 listbox，避免并列下拉互相干扰）。 */
export async function pickOption(select: Locator, optionName: string): Promise<void> {
  await select.click()
  const listbox = select.page().getByRole('listbox').last()
  await listbox.getByRole('option', { name: optionName, exact: true }).click()
}

/** 配置面板槽位映射：点开槽位下拉并选字段。 */
export async function mapField(page: Page, slotLabel: string, fieldLabel: string): Promise<void> {
  await pickOption(page.getByRole('combobox', { name: slotLabel }), fieldLabel)
}

/** 断言图表 canvas 上有「墨迹」（非空白像素超过阈值）。 */
export async function expectCanvasInk(page: Page, minInk = 40, timeout = 10_000): Promise<void> {
  const canvases = page.getByTestId('chart-canvas').locator('canvas')
  await expect(canvases.first()).toBeVisible()
  await expect
    .poll(
      // zrender 分层渲染：大数据量 progressive 序列画在独立图层，
      // 必须汇总所有 canvas 图层的墨迹，不能只读第一层
      async () =>
        canvases.evaluateAll((els: HTMLCanvasElement[]) => {
          let ink = 0
          for (const el of els) {
            const ctx = el.getContext('2d')
            if (!ctx || el.width === 0) continue
            const { data } = ctx.getImageData(0, 0, el.width, el.height)
            for (let i = 0; i < data.length; i += 4 * 173) {
              const visible = data[i + 3] > 0
              const nonWhite = data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240
              if (visible && nonWhite) ink += 1
            }
          }
          return ink
        }),
      { timeout },
    )
    .toBeGreaterThan(minInk)
}

/** 断言当前没有 error toast。 */
export async function expectNoErrorToast(page: Page): Promise<void> {
  await expect(page.locator('.is-toast--error')).toHaveCount(0)
}

/** 通过 Add data 菜单导入 CSV 文本。 */
export async function importCsv(page: Page, tableName: string, csvText: string): Promise<void> {
  await page.getByRole('button', { name: 'Add data' }).click()
  await page.getByRole('menuitem', { name: 'Import CSV' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('选择 CSV 文件').setInputFiles({
    name: `${tableName}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(csvText, 'utf-8'),
  })
  await expect(dialog.getByLabel('表名')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add table' }).click()
  await expect(dialog).toBeHidden()
}

/** 生成 N 行两列（x, y）CSV。 */
export function makeCsv(rows: number): string {
  const lines = ['x,y']
  for (let i = 1; i <= rows; i += 1) lines.push(`${i},${(i * 7) % 97}`)
  return lines.join('\n')
}

/**
 * 在图表 canvas 上做一次套索圈选。
 * echarts 5.6 的 polygon brush 是自由拖拽轨迹：mousedown 起笔 → mousemove 沿途
 * 记录轨迹点 → mouseup 自动闭合多边形并触发 brushEnd。
 * fx/fy 为相对 canvas 的归一化坐标顶点。
 */
export async function lassoOnChart(page: Page, vertices: Array<readonly [number, number]>): Promise<void> {
  const canvas = page.getByTestId('chart-canvas').locator('canvas').first()
  // MODEL TABLES 面板展开会把图表压扁；套索前确保图表有足够高度
  await expect.poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 }).toBeGreaterThan(150)
  const box = (await canvas.boundingBox())!
  const pts = vertices.map(([fx, fy]) => [box.x + box.width * fx, box.y + box.height * fy] as const)
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 8 })
  await page.mouse.move(pts[0][0], pts[0][1], { steps: 4 })
  await page.mouse.up()
}
