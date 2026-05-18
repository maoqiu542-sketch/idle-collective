import { test, expect } from '@playwright/test'

test.describe('视觉截图对比', () => {
  test.describe.configure({ timeout: 90000 })

  test('截图：完整游戏界面加载状态', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.game-title', { timeout: 30000 })
    await page.waitForSelector('.resource-bar', { timeout: 10000 })
    await page.waitForSelector('.tab-bar', { timeout: 10000 })
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'e2e-screenshots/full-game-interface.png',
      fullPage: true,
    })
  })

  test('截图：招募面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '招募' }).click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'e2e-screenshots/recruit-panel.png',
      fullPage: true,
    })
  })

  test('截图：建造商店面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '建造' }).click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'e2e-screenshots/shop-building-panel.png',
      fullPage: true,
    })
  })

  test('截图：科技树面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '科技' }).click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'e2e-screenshots/tech-panel.png',
      fullPage: true,
    })
  })

  test('截图：角色详情面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.character-row', { timeout: 30000 })

    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'e2e-screenshots/character-panel.png',
      fullPage: true,
    })
  })

  test('截图：收起底部面板状态', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.panel-toggle-btn', { timeout: 30000 })

    await page.locator('.panel-toggle-btn').click()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'e2e-screenshots/collapsed-panel.png',
      fullPage: true,
    })
  })
})
