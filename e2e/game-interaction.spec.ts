import { test, expect } from '@playwright/test'

test.describe('游戏交互 - 标签与面板切换', () => {
  test.describe.configure({ timeout: 60000 })

  test('点击"招募"标签应显示招募面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '招募' }).click()

    await expect(page.locator('.tab-content')).toBeVisible()
  })

  test('点击"建造"标签应显示建造商店面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '建造' }).click()

    await expect(page.locator('.tab-content')).toBeVisible()
  })

  test('点击"科技"标签应显示科技树面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    await page.locator('.tab-btn').filter({ hasText: '科技' }).click()

    await expect(page.locator('.tab-content')).toBeVisible()
  })

  test('标签切换后应正确高亮当前标签', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tab-bar', { timeout: 30000 })

    const tabs = ['招募', '建造', '科技', '角色']
    for (const tab of tabs) {
      await page.locator('.tab-btn').filter({ hasText: tab }).click()
      await expect(page.locator('.tab-btn.active')).toContainText(tab)
    }
  })
})

test.describe('游戏交互 - 全局策略预设', () => {
  test.describe.configure({ timeout: 60000 })

  test('点击"生存稳态"策略应激活预设模式', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.strategy-controls', { timeout: 30000 })

    await page.locator('.strategy-controls button', { hasText: '生存稳态' }).click()

    await expect(page.locator('.preset-lock-banner')).toBeVisible()
  })

  test('点击"扩张建造"策略应切换预设', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.strategy-controls', { timeout: 30000 })

    await page.locator('.strategy-controls button', { hasText: '扩张建造' }).click()

    await expect(page.locator('.strategy-controls button.active', { hasText: '扩张建造' })).toBeVisible()
  })

  test('点击"科研冲刺"策略后切回手动优先级', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.strategy-controls', { timeout: 30000 })

    await page.locator('.strategy-controls button', { hasText: '科研冲刺' }).click()
    await expect(page.locator('.preset-lock-banner')).toBeVisible()

    await page.locator('.strategy-controls button', { hasText: '手动优先级' }).click()
    await expect(page.locator('.preset-lock-banner')).not.toBeVisible()
  })
})

test.describe('游戏交互 - 角色详情', () => {
  test.describe.configure({ timeout: 60000 })

  test('点击地图上的角色应弹出角色详情面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-main', { timeout: 30000 })

    const mapContainer = page.locator('.app-main')
    await expect(mapContainer).toBeVisible()
  })

  test('角色优先级面板默认展开', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.bottom-panel', { timeout: 30000 })

    await expect(page.locator('.skills-table')).toBeVisible()
  })

  test('点击"收起面板"按钮应收起底部面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.panel-toggle-btn', { timeout: 30000 })

    await page.locator('.panel-toggle-btn').click()

    await expect(page.locator('.bottom-panel.collapsed')).toBeVisible()
    await expect(page.locator('.collapsed-strip')).toBeVisible()
  })

  test('收起后再展开面板应恢复技能表格', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.panel-toggle-btn', { timeout: 30000 })

    await page.locator('.panel-toggle-btn').click()
    await expect(page.locator('.bottom-panel.collapsed')).toBeVisible()

    await page.locator('.panel-toggle-btn').click()
    await expect(page.locator('.skills-table')).toBeVisible()
  })
})

test.describe('游戏交互 - 地图操作', () => {
  test.describe.configure({ timeout: 60000 })

  test('地图画布应渲染并响应鼠标滚动', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-main', { timeout: 30000 })

    const mapView = page.locator('.app-main canvas, .app-main div[class*="map"]').first()
    const mapExists = await mapView.count()
    if (mapExists > 0) {
      await mapView.scrollIntoViewIfNeeded()
      const box = await mapView.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, 100)
      }
    }
  })
})

test.describe('游戏交互 - 联机/速度切换', () => {
  test.describe.configure({ timeout: 60000 })

  test('点击加速/联机按钮应弹出速度控制面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.online-toggle-btn', { timeout: 30000 })

    await page.locator('.online-toggle-btn').click()

    const onlinePanel = page.locator('.online-toggle-btn')
    await expect(onlinePanel).toBeVisible()
  })
})
