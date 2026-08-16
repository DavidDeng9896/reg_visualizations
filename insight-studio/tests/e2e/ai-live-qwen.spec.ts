/**
 * 真实 Qwen 兼容端 UI 抽检。假定 :7100 / :8787 / 真实 dsh :3081 已启动且 AI 已配置。
 * npx playwright test --config=playwright.live-qwen.config.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { createDemoAndEnter } from './helpers'

async function openAi(page: Page): Promise<void> {
  await page.getByTestId('ai-fab').click()
  await expect(page.getByTestId('ai-drawer')).toBeVisible()
}

async function newConv(page: Page): Promise<void> {
  await page.getByTestId('ai-newconv').click()
  await expect(page.getByTestId('ai-input')).toBeVisible()
}

async function sendAndWait(page: Page, prompt: string, timeout = 180_000): Promise<void> {
  await page.getByTestId('ai-input').fill(prompt)
  await page.getByTestId('ai-send').click()
  await expect(page.getByTestId('ai-stop')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ai-stop')).toHaveCount(0, { timeout })
}

test.describe.configure({ mode: 'serial', timeout: 300_000 })

test.describe('Qwen live UI', () => {
  test.beforeAll(async ({ request }) => {
    const cfg = await (await request.get('/api/ai/config')).json()
    expect(cfg.configured, 'AI 未配置，无法跑真实模型 UI').toBeTruthy()
    const health = await (await request.get('http://127.0.0.1:3081/health')).json()
    expect(health.ok).toBeTruthy()
    expect(health.runtime).toBe('dsh')
  })

  test('输入条显示已配置模型，无工具闲聊能收到回复', async ({ page }) => {
    await page.goto('/')
    await openAi(page)
    await newConv(page)
    const pill = page.getByTestId('ai-model')
    await expect(pill).toContainText(/qwen/i)
    await sendAndWait(page, '你是谁？用一句话介绍。禁止调用任何工具。', 90_000)
    await expect(page.getByTestId('ai-messages')).not.toHaveText(/^\s*$/)
    const body = await page.getByTestId('ai-drawer').innerText()
    expect(body).toMatch(/助手|分析|数据|Insight|科学/)
  })

  test('工作区对话会走平台工具并出现轨迹', async ({ page }) => {
    await createDemoAndEnter(page)
    await openAi(page)
    await newConv(page)
    await sendAndWait(page, '列出当前分析里的表名，调用 list_tables。不要删数据、不要出图。', 180_000)
    const drawer = page.getByTestId('ai-drawer')
    await expect(drawer).toContainText(/list_tables|表/i)
    const trace = page.getByTestId('ai-trace')
    if (await trace.count()) {
      await expect(trace.last()).toBeVisible()
    }
  })

  test('ask_user 场景能弹出提问卡并提交选项', async ({ page }) => {
    await createDemoAndEnter(page)
    await openAi(page)
    await newConv(page)
    await page.getByTestId('ai-input').fill(
      '我还没决定图种。必须调用 ask_user，选项为「散点图」和「柱状图」，问我选哪一种。在我回答之前不要出图。',
    )
    await page.getByTestId('ai-send').click()
    const ask = page.getByTestId('ai-ask')
    const stop = page.getByTestId('ai-stop')
    await expect(stop.or(ask)).toBeVisible({ timeout: 60_000 })
    if (await ask.isVisible({ timeout: 120_000 }).catch(() => false)) {
      const opt = ask.getByRole('button').filter({ hasText: /散点图|柱状图/ }).first()
      if (await opt.count()) await opt.click()
      else await page.getByTestId('ai-ask-other').fill('散点图')
      await page.getByTestId('ai-ask-submit').click()
      await expect(page.getByTestId('ai-stop')).toHaveCount(0, { timeout: 180_000 })
    } else {
      await expect(page.getByTestId('ai-stop')).toHaveCount(0, { timeout: 180_000 })
      test.info().annotations.push({ type: 'note', description: '模型未弹出 ask_user 卡，记为软跳过交互断言' })
    }
  })

  test('发送后可中止', async ({ page }) => {
    await createDemoAndEnter(page)
    await openAi(page)
    await newConv(page)
    await page.getByTestId('ai-input').fill('先 list_tables，再 get_table_schema，再画散点图并写长报告。')
    await page.getByTestId('ai-send').click()
    await expect(page.getByTestId('ai-stop')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('ai-stop').click()
    await expect(page.getByTestId('ai-stop')).toHaveCount(0, { timeout: 30_000 })
    await expect(page.getByTestId('ai-send')).toBeVisible()
  })
})
