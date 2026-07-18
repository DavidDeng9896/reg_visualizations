/**
 * Patch newViewOfType to use data-ia-new-view scope (Round 37).
 * Also log Create visibility for debugging.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'tests/e2e/ui-full-10-rounds.mts'
let src = readFileSync(path, 'utf8')

const old = `async function newViewOfType(page: Page, type: string) {
  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  await page.waitForSelector('text=新建视图')
  await page.getByLabel('View Type').selectOption(type)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  // Round 31: after create, focus lands on the new tree node (not body / opener CTA).
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('role') === 'treeitem',
    undefined,
    { timeout: 8000 },
  )
  await page.waitForTimeout(800)
}`

const neu = `async function newViewOfType(page: Page, type: string) {
  await page.locator('.ops-btn').first().click()
  await page.getByRole('menuitem', { name: 'New view' }).click()
  const dialog = page.locator('[data-ia-new-view="1"]')
  await dialog.waitFor({ state: 'visible', timeout: 10000 })
  await dialog.getByLabel('View Type').selectOption(type)
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  // Round 31: after create, focus lands on the new tree node (not body / opener CTA).
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('role') === 'treeitem',
    undefined,
    { timeout: 8000 },
  )
  await page.waitForTimeout(800)
}`

if (!src.includes(old)) {
  console.error('old block not found')
  process.exit(1)
}
writeFileSync(path, src.replace(old, neu))
console.log('patched')
