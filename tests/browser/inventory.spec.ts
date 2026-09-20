import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('real hotel discovery saves a sourced shortlist without inventing accessibility', async ({ page }) => {
  test.skip(process.env.LIVE_INVENTORY_TEST !== '1', 'Requires configured local Convex and LiteAPI sandbox; never substitute a mock.')
  test.setTimeout(240000)
  const session = JSON.parse(readFileSync('.convex/browser-session.json', 'utf8')) as { address: string; token: string; refreshToken: string }
  const { address } = session
  const namespace = address.replace(/[^a-zA-Z0-9]/g, '')
  await page.addInitScript(({ token, refreshToken, namespace }) => {
    localStorage.setItem(`__convexAuthJWT_${namespace}`, token)
    localStorage.setItem(`__convexAuthRefreshToken_${namespace}`, refreshToken)
  }, { token: session.token, refreshToken: session.refreshToken, namespace })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Real hotel verification', exact: true })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('row', { name: /Door clear opening/ })).toContainText('Needs an answer')
  await expect(page.getByRole('row', { name: /Room availability/ })).toContainText('Not confirmed')
  await expect(page.getByRole('region', { name: /Hotel comparison, scroll/ }).getByText('LiteAPI · sandbox property content')).toBeVisible()
  await page.getByRole('button', { name: 'New trip', exact: true }).click()
  await page.getByLabel('Hotel name (optional)').fill('Royal Lancaster')
  await page.getByRole('button', { name: 'Find real hotels' }).click()
  await expect(page.getByRole('heading', { name: 'Royal Lancaster London', exact: true })).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: 'Choose this hotel' }).first().click()
  await expect(page.getByText(/provider room names available/)).toBeVisible({ timeout: 60000 })
  await expect(page.getByLabel('Specific room type')).toHaveAttribute('list', /rooms-/)
  await page.getByRole('button', { name: 'Close' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'artifacts/real-inventory-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'New trip', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Sign out/ })).toBeVisible()
  await page.screenshot({ path: 'artifacts/real-inventory-mobile.png', fullPage: true })
})
