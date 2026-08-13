/**
 * 真实模拟：外部数据库连接全链路（Postgres + MySQL）
 * 前置：
 *   - 前端 :7100，SQL 代理 :7120
 *   - Postgres insight_demo / insight / insight_test @ 5432 表 assays
 *   - MySQL   insight_demo / insight / insight_test @ 3306 表 assays
 *
 *   npx tsx tests/manual/sql-remote-db-connect.mts
 *   BASE_URL=http://bore.pub:PORT npx tsx tests/manual/sql-remote-db-connect.mts
 */
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:7100'

type DbTarget = {
  id: string
  dialect: 'postgres' | 'mysql' | 'mariadb'
  name: string
  host: string
  port: string
  database: string
  user: string
  password: string
  sample: string
}

const TARGETS: DbTarget[] = [
  {
    id: 'pg',
    dialect: 'postgres',
    name: 'demo-pg',
    host: '127.0.0.1',
    port: '5432',
    database: 'insight_demo',
    user: 'insight',
    password: 'insight_test',
    sample: 'A1',
  },
  {
    id: 'mysql',
    dialect: 'mysql',
    name: 'demo-mysql',
    host: '127.0.0.1',
    port: '3306',
    database: 'insight_demo',
    user: 'insight',
    password: 'insight_test',
    sample: 'M1',
  },
]

async function closeOverlays(page: Page) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(100)
  }
}

async function openSqlDialog(page: Page) {
  await closeOverlays(page)
  await page.locator('button.side__add[aria-label="Add data"]').click()
  await page.getByRole('menuitem', { name: /Import from SQL/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Import from SQL' })
  await dlg.waitFor({ state: 'visible', timeout: 10000 })
  await dlg.getByRole('tab', { name: '外部数据库' }).click()
  await page.waitForTimeout(300)
  return dlg
}

async function ensureFormOpen(dlg: ReturnType<Page['getByRole']>) {
  const editBtn = dlg.getByRole('button', { name: /编辑连接|收起配置/ })
  if (await editBtn.isVisible().catch(() => false)) {
    if (/编辑连接/.test(await editBtn.innerText())) await editBtn.click()
  }
}

async function selectDialect(dlg: ReturnType<Page['getByRole']>, page: Page, dialect: 'postgres' | 'mysql') {
  const trigger = dlg.getByLabel('数据库类型')
  await trigger.click()
  await page.waitForTimeout(200)
  const opt = page.locator('.is-select__option, [role="option"]').filter({
    hasText: dialect === 'postgres' ? /Postgres/i : /MySQL/i,
  })
  await opt.first().click()
  await page.waitForTimeout(200)
}

async function fillConn(dlg: ReturnType<Page['getByRole']>, db: DbTarget) {
  await dlg.getByLabel('连接名称', { exact: true }).fill(db.name)
  await dlg.getByLabel('Host', { exact: true }).fill(db.host)
  await dlg.getByLabel('Port', { exact: true }).fill(db.port)
  await dlg.getByLabel('Database', { exact: true }).fill(db.database)
  await dlg.getByLabel('User', { exact: true }).fill(db.user)
  await dlg.getByLabel('Password', { exact: true }).fill(db.password)
}

async function runTarget(page: Page, db: DbTarget) {
  console.log(`\n=== ${db.id} ${db.dialect} ===`)

  // API smoke
  const api = await page.request.post(`${BASE.replace(/\/$/, '')}/api/sql/test`, {
    data: {
      dialect: db.dialect,
      host: db.host,
      port: Number(db.port),
      database: db.database,
      user: db.user,
      password: db.password,
      ssl: false,
    },
  })
  const body = await api.json()
  console.log('api test', api.status(), body.ok, String(body.version || body.error || '').slice(0, 60))
  if (!body.ok) throw new Error(`${db.id} API test failed: ${JSON.stringify(body)}`)

  const dlg = await openSqlDialog(page)
  await ensureFormOpen(dlg)
  await dlg.getByRole('button', { name: '新建连接' }).click()
  await page.waitForTimeout(200)
  await ensureFormOpen(dlg)

  await selectDialect(dlg, page, db.dialect)
  await fillConn(dlg, db)

  // wrong password first
  await dlg.getByLabel('Password', { exact: true }).fill('WRONG_PASSWORD')
  await dlg.getByRole('button', { name: '测试并保存' }).click()
  await page.waitForTimeout(2000)
  const badMsg = await dlg.locator('.sql__test-msg').innerText()
  console.log('bad password msg', badMsg)
  if (!/fail|失败|password|Access denied|认证/i.test(badMsg)) {
    throw new Error(`${db.id} wrong password should show error, got: ${badMsg}`)
  }
  const badTone = await dlg.locator('.sql__test-msg--bad').count()
  if (!badTone) throw new Error(`${db.id} error tone class missing`)

  // correct password
  await dlg.getByLabel('Password', { exact: true }).fill(db.password)
  await dlg.getByRole('button', { name: '测试并保存' }).click()
  await page.waitForTimeout(3000)
  const okMsg = await dlg.locator('.sql__test-msg').innerText()
  console.log('ok msg', okMsg)
  if (!/连接成功/.test(okMsg)) throw new Error(`${db.id} expected 连接成功, got: ${okMsg}`)
  if (!(await dlg.locator('.sql__test-msg--ok').count())) throw new Error(`${db.id} success tone missing`)

  const side = await dlg.locator('.sql__side').innerText()
  console.log('side', side.replace(/\s+/g, ' ').slice(0, 120))
  if (!/assays/i.test(side)) throw new Error(`${db.id} schema missing assays`)

  await dlg.locator('button.sql__table').filter({ hasText: 'assays' }).click()
  await dlg.getByRole('button', { name: '运行' }).click()
  await page.waitForTimeout(2000)
  const runErr = await dlg.locator('.sql__error').innerText().catch(() => '')
  if (runErr) throw new Error(`${db.id} run error: ${runErr}`)
  const preview = await dlg.locator('.sql__preview').innerText()
  if (!new RegExp(db.sample, 'i').test(preview)) {
    throw new Error(`${db.id} preview missing ${db.sample}: ${preview.slice(0, 200)}`)
  }

  const tableName = `${db.id}_assays_import`
  await dlg.getByLabel('表名').fill(tableName)
  await dlg.getByRole('button', { name: /Add table/i }).click()
  await page.waitForTimeout(1500)
  const tree = await page.locator('.tree').innerText()
  if (!tree.includes(tableName)) throw new Error(`${db.id} not imported into tree`)
  console.log(`✓ ${db.id} connect → schema → query → import`)
}

async function main() {
  const browser = await chromium.launch({ headless: true, slowMo: 20 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  console.log(`SQL remote DB connect → ${BASE}`)
  const health = await page.request.get(`${BASE.replace(/\/$/, '')}/api/sql/health`)
  console.log('proxy health', health.status(), await health.text())
  if (!health.ok()) throw new Error('SQL proxy unreachable via frontend origin')

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '新建分析' }).click()
  const createDlg = page.getByRole('dialog', { name: /新建分析/ })
  await createDlg.waitFor({ state: 'visible' })
  await createDlg.getByRole('textbox').fill('sql-db-full-' + Date.now())
  await createDlg.getByRole('button', { name: '创建' }).click()
  await page.waitForURL(/\/analysis\//, { timeout: 20000 })
  await page.waitForTimeout(1200)

  for (const db of TARGETS) {
    await runTarget(page, db)
  }

  const fatal = errors.filter((e) => /randomUUID|proxy|Failed to fetch|500/i.test(e))
  if (fatal.length) throw new Error('fatal errors: ' + fatal.join(' | '))
  console.log('\nPASS postgres + mysql remote DB connect')
  console.log('page errors', errors.length ? errors : 'none')
  await page.screenshot({ path: '/tmp/sql-db-full-ok.png', fullPage: true })
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
