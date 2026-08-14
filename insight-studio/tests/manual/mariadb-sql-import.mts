/**
 * 实机：MariaDB 外部导入全链路（UI + 代理 + 落库）
 * 前置：前端 :7100，SQL 代理 :7120，Go API :8787，MariaDB insight_demo.assays
 */
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:7100'

async function closeOverlays(page: Page) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(80)
  }
}

async function openSqlDialog(page: Page) {
  await closeOverlays(page)
  await page.locator('button.side__add[aria-label="Add data"]').click()
  await page.getByRole('menuitem', { name: /Import from SQL/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Import from SQL' })
  await dlg.waitFor({ state: 'visible', timeout: 10000 })
  await dlg.getByRole('tab', { name: '外部数据库' }).click()
  await page.waitForTimeout(250)
  return dlg
}

async function ensureFormOpen(dlg: ReturnType<Page['getByRole']>) {
  const editBtn = dlg.getByRole('button', { name: /编辑连接|收起配置/ })
  if (await editBtn.isVisible().catch(() => false)) {
    if (/编辑连接/.test(await editBtn.innerText())) await editBtn.click()
  }
}

async function selectMariaDB(dlg: ReturnType<Page['getByRole']>, page: Page) {
  const trigger = dlg.getByLabel('数据库类型')
  await trigger.click()
  await page.waitForTimeout(200)
  const opt = page.locator('.is-select__option, [role="option"]').filter({ hasText: /^MariaDB$/i })
  if (!(await opt.count())) {
    throw new Error('dialect dropdown missing MariaDB option')
  }
  await opt.first().click()
  await page.waitForTimeout(200)
  const port = await dlg.getByLabel('Port', { exact: true }).inputValue()
  if (port !== '3306') throw new Error(`MariaDB default port expected 3306, got ${port}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  const health = await page.request.get(`${BASE}/health`)
  const healthJson = await health.json()
  console.log('app health', healthJson)
  if (healthJson.storage !== 'mariadb') throw new Error(`expected storage=mariadb, got ${JSON.stringify(healthJson)}`)

  const sqlHealth = await page.request.get(`${BASE}/api/sql/health`)
  if (!sqlHealth.ok()) throw new Error('SQL proxy via frontend origin failed')

  const apiTest = await page.request.post(`${BASE}/api/sql/test`, {
    data: {
      dialect: 'mariadb',
      host: '127.0.0.1',
      port: 3306,
      database: 'insight_demo',
      user: 'insight',
      password: 'insight',
      ssl: false,
    },
  })
  const apiBody = await apiTest.json()
  console.log('api mariadb test', apiTest.status(), apiBody.ok, String(apiBody.version || '').slice(0, 80))
  if (!apiBody.ok || !/MariaDB/i.test(String(apiBody.version || ''))) {
    throw new Error(`mariadb test failed: ${JSON.stringify(apiBody)}`)
  }

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByRole('button', { name: '新建分析' }).click()
  const createDlg = page.getByRole('dialog', { name: /新建分析/ })
  await createDlg.waitFor({ state: 'visible' })
  const name = 'mariadb-live-' + Date.now()
  await createDlg.getByRole('textbox').fill(name)
  await createDlg.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/analysis\//, { timeout: 20000 })
  const analysisId = page.url().split('/analysis/')[1]?.split(/[?#]/)[0]
  if (!analysisId) throw new Error('no analysis id in URL')
  console.log('created analysis', analysisId)

  const dlg = await openSqlDialog(page)
  await ensureFormOpen(dlg)
  if (await dlg.getByRole('button', { name: '新建连接' }).isVisible()) {
    await dlg.getByRole('button', { name: '新建连接' }).click()
    await page.waitForTimeout(200)
  }
  await ensureFormOpen(dlg)
  await selectMariaDB(dlg, page)
  await dlg.getByLabel('连接名称', { exact: true }).fill('demo-mariadb')
  await dlg.getByLabel('Host', { exact: true }).fill('127.0.0.1')
  await dlg.getByLabel('Port', { exact: true }).fill('3306')
  await dlg.getByLabel('Database', { exact: true }).fill('insight_demo')
  await dlg.getByLabel('User', { exact: true }).fill('insight')
  await dlg.getByLabel('Password', { exact: true }).fill('WRONG')
  await dlg.getByRole('button', { name: '测试并保存' }).click()
  await page.waitForTimeout(2500)
  const badMsg = await dlg.locator('.sql__test-msg').innerText()
  console.log('bad password', badMsg)
  if (!/fail|失败|password|Access denied|认证|denied/i.test(badMsg)) {
    throw new Error(`wrong password should error, got: ${badMsg}`)
  }

  await dlg.getByLabel('Password', { exact: true }).fill('insight')
  await dlg.getByRole('button', { name: '测试并保存' }).click()
  await page.waitForTimeout(3000)
  const okMsg = await dlg.locator('.sql__test-msg').innerText()
  console.log('ok msg', okMsg)
  if (!/连接成功/.test(okMsg)) throw new Error(`expected 连接成功, got: ${okMsg}`)
  if (!/MariaDB/i.test(okMsg) && !/10\./.test(okMsg)) {
    console.log('warn: success message may not include MariaDB version:', okMsg)
  }

  const side = await dlg.locator('.sql__side').innerText()
  if (!/assays/i.test(side)) throw new Error(`schema missing assays: ${side}`)
  await dlg.locator('button.sql__table').filter({ hasText: 'assays' }).click()
  await dlg.getByRole('button', { name: '运行' }).click()
  await page.waitForTimeout(2000)
  const runErr = await dlg.locator('.sql__error').innerText().catch(() => '')
  if (runErr) throw new Error(`run error: ${runErr}`)
  const preview = await dlg.locator('.sql__preview').innerText()
  if (!/A1/i.test(preview) || !/M1/i.test(preview)) {
    throw new Error(`preview missing A1/M1: ${preview.slice(0, 300)}`)
  }

  const tableName = 'mdb_assays_import'
  await dlg.getByLabel('表名').fill(tableName)
  await dlg.getByRole('button', { name: /Add table/i }).click()
  await page.waitForTimeout(2000)
  const tree = await page.locator('.tree').innerText()
  if (!tree.includes(tableName)) throw new Error(`not imported into tree: ${tree.slice(0, 400)}`)
  console.log('imported table into tree')

  await page.waitForTimeout(1200)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const tree2 = await page.locator('.tree').innerText()
  if (!tree2.includes(tableName)) throw new Error(`after reload table missing: ${tree2.slice(0, 400)}`)
  console.log('table survived reload')

  const apiDoc = await page.request.get(`${BASE}/api/analyses/${analysisId}`)
  if (!apiDoc.ok()) throw new Error(`GET analysis ${analysisId} ${apiDoc.status()}`)
  const doc = await apiDoc.json()
  const tables = doc.tables || []
  const imported = tables.find((t: { name?: string }) => t.name === tableName)
  if (!imported) throw new Error(`HTTP analysis missing table ${tableName}: ${tables.map((t: { name?: string }) => t.name)}`)
  const rowCount = Array.isArray(imported.rows) ? imported.rows.length : 0
  if (rowCount < 2) throw new Error(`imported rows too few: ${rowCount}`)
  console.log('HTTP/MariaDB document has imported table rows=', rowCount)

  await page.screenshot({ path: '/tmp/mariadb-sql-import-ok.png', fullPage: true })
  const fatal = errors.filter((e) => /randomUUID|proxy|Failed to fetch|500/i.test(e))
  if (fatal.length) throw new Error('fatal page errors: ' + fatal.join(' | '))
  console.log('PASS browser MariaDB SQL import')
  console.log('page errors', errors.length ? errors.slice(0, 8) : 'none')
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
