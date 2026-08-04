/**
 * 对当前开发环境（Vite :7100 + Go :8787）冒烟「能力」面板。
 * 不走默认 e2e（那套仍起 Node :8788，无 Skills/MCP）。
 *
 *   npx playwright test tests/e2e/skills-mcp-panel.spec.ts --config=playwright.skills-mcp.config.ts
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { execSync } from 'node:child_process'

test.describe('能力面板 Skills/MCP', () => {
  test('侧栏可打开面板，列出官方 Skill，可预览', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '能力' }).click()
    const dialog = page.getByRole('dialog', { name: '能力' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Chart best practices', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: '预览' }).first().click()
    await expect(dialog.locator('.cap__preview-body')).toContainText('list_tables')
  })

  test('可导入 zip Skill 并出现在列表', async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-'))
    fs.writeFileSync(
      path.join(dir, 'skill.json'),
      JSON.stringify({
        id: `e2e-skill-${Date.now()}`,
        name: 'E2E Skill',
        version: '0.0.1',
        description: 'playwright import',
        tags: [],
      }),
    )
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# E2E Skill\n\nhello')
    const zip = path.join(dir, 'pkg.zip')
    execSync(`zip -q ${JSON.stringify(zip)} skill.json SKILL.md`, { cwd: dir })

    await page.goto('/')
    await page.getByRole('button', { name: '能力' }).click()
    const dialog = page.getByRole('dialog', { name: '能力' })
    await expect(dialog).toBeVisible()

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      dialog.getByRole('button', { name: '导入 zip' }).click(),
    ])
    await fileChooser.setFiles(zip)
    await expect(dialog.getByText('E2E Skill', { exact: true })).toBeVisible({ timeout: 10_000 })

    // cleanup via API
    const id = JSON.parse(fs.readFileSync(path.join(dir, 'skill.json'), 'utf8')).id as string
    await page.request.delete(`/api/ai/skills/${encodeURIComponent(id)}`)
  })

  test('MCP Tab 可添加连接并刷新 tools', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '能力' }).click()
    const dialog = page.getByRole('dialog', { name: '能力' })
    await dialog.getByRole('tab', { name: 'MCP' }).click()

    await dialog.getByPlaceholder('如 Internal Docs MCP').fill('PW Mock MCP')
    await dialog.getByPlaceholder('https://…').fill('http://127.0.0.1:18999')
    await dialog.getByRole('button', { name: '添加连接' }).click()
    await expect(dialog.getByText('PW Mock MCP', { exact: true })).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('button', { name: '刷新 tools' }).first().click()
    await expect(dialog.getByText(/1 tools/)).toBeVisible({ timeout: 10_000 })

    const list = await page.request.get('/api/ai/mcp/servers')
    const servers = (await list.json()) as Array<{ id: string; name: string }>
    const hit = servers.find((s) => s.name === 'PW Mock MCP')
    expect(hit).toBeTruthy()
    if (hit) await page.request.delete(`/api/ai/mcp/servers/${encodeURIComponent(hit.id)}`)
  })
})
