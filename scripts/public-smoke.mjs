import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const url = process.env.ACCESSRELAY_PUBLIC_URL ?? 'https://accessrelay.emmanuelsekyi.chatgpt.site'
const started = performance.now()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.getByRole('heading', { name: 'Create your private workspace' }).waitFor({ timeout: 60_000 })
  const stamp = Date.now()
  await page.getByLabel('Email').fill(`production-smoke-${stamp}@accessrelay.test`)
  await page.getByLabel('Password').fill(`Release-${stamp}-verified!`)
  await page.getByRole('button', { name: /Create workspace/ }).click()
  await page.getByRole('heading', { name: 'Compare the rooms you are actually considering.' }).waitFor({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Create your first trip' }).click()
  await page.getByLabel('Hotel name (optional)').fill('Royal Lancaster')
  await page.getByRole('button', { name: 'Find real hotels' }).click()
  await page.getByRole('heading', { name: 'Royal Lancaster London' }).waitFor({ timeout: 90_000 })
  mkdirSync('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/public-production.png', fullPage: true })
  const artifact = {
    verifiedAt: new Date().toISOString(),
    url,
    httpAndJavaScriptLoaded: true,
    convexPasswordAccountCreated: true,
    productionLiteApiSearchReturned: 'Royal Lancaster London',
    elapsedMs: Math.round(performance.now() - started),
    screenshot: 'artifacts/public-production.png',
  }
  writeFileSync('artifacts/public-smoke.json', `${JSON.stringify(artifact, null, 2)}\n`)
  console.log(JSON.stringify(artifact, null, 2))
} finally {
  await browser.close()
}
