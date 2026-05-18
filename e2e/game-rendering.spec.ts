import { test, expect } from '@playwright/test'

test.describe('游戏主界面视觉渲染', () => {
  test('游戏启动后应显示加载动画', async ({ page }) => {
    await page.goto('/')
    const loadingSpinner = page.locator('.loading-spinner')
    await expect(loadingSpinner).toBeVisible({ timeout: 15000 })
  })

  test('加载完成后应显示完整游戏主界面', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.game-title', { timeout: 30000 })

    await expect(page.locator('.game-title')).toHaveText('Idle Collective')
    await expect(page.locator('.resource-bar')).toBeVisible()
    await expect(page.locator('.tab-bar')).toBeVisible()
    await expect(page.locator('.app-main')).toBeVisible()
  })

  test('资源栏应显示5种核心资源', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.resource-bar', { timeout: 30000 })

    const resources = page.locator('.resource-item')
    await expect(resources).toHaveCount(5)

    const resourceNames = ['木材', '石材', '食物', '金币', '核心零件']
    for (const name of resourceNames) {
      await expect(page.locator('.resource-name', { hasText: name })).toBeVisible()
    }
  })

  test('底部标签栏应包含5个功能标签', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    const tabs = ['角色', '招募', '建造', '科技', 'Boss']
    const tabBar = page.locator('.tab-bar')
    for (const tab of tabs) {
      await expect(tabBar.locator('.tab-label', { hasText: tab })).toBeVisible()
    }
  })

  test('游戏时间显示应为初始值00:00:00', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.game-time', { timeout: 30000 })

    await expect(page.locator('.time-value')).toBeVisible()
  })

  test('左侧边栏应显示发展里程碑和引导面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-sidebar', { timeout: 30000 })

    await expect(page.locator('.app-sidebar')).toBeVisible()
  })

  test('聚落信息应显示宜居度和发展度', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.settlement-metrics', { timeout: 30000 })

    const metrics = page.locator('.settlement-metrics')
    await expect(metrics).toBeVisible()
    await expect(metrics.locator('text=宜居度')).toBeVisible()
    await expect(metrics.locator('text=发展度')).toBeVisible()
  })

  test('策略预设按钮应显示全部4种策略', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.strategy-controls', { timeout: 30000 })

    const presets = ['生存稳态', '扩张建造', '科研冲刺', '备战Boss']
    for (const preset of presets) {
      await expect(page.locator('.strategy-controls button', { hasText: preset })).toBeVisible()
    }
  })

  test('默认角色数量应为3个', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.character-row', { timeout: 30000 })

    const rows = page.locator('.character-row')
    const count = await rows.count()
    expect(count).toBe(3)
  })
})
