// Record a short, captioned tour of a completed AccessRelay production workspace.
// Supply DEMO_EMAIL and DEMO_PASSWORD through the process environment.
import { chromium } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'

const publicUrl = process.env.ACCESSRELAY_PUBLIC_URL ?? 'https://accessrelay.emmanuelsekyi.chatgpt.site'
const email = process.env.DEMO_EMAIL
const password = process.env.DEMO_PASSWORD
const savedSession = process.env.DEMO_STORAGE_STATE
if ((!email || !password) && (!savedSession || !existsSync(savedSession))) throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD, or pass an existing DEMO_STORAGE_STATE file.')

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const recordingDir = 'artifacts/demo-recording'
mkdirSync(recordingDir, { recursive: true })
rmSync('artifacts/accessrelay-demo-silent.webm', { force: true })

async function pause(page, ms) {
  await page.waitForTimeout(ms)
}

async function caption(page, step, title, body) {
  await page.evaluate(({ step, title, body }) => {
    let node = document.querySelector('#accessrelay-demo-caption')
    if (!node) {
      node = document.createElement('aside')
      node.id = 'accessrelay-demo-caption'
      node.setAttribute('aria-hidden', 'true')
      Object.assign(node.style, {
        position: 'fixed', left: '48px', right: '48px', bottom: '32px', zIndex: '2147483647',
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '18px', alignItems: 'center',
        padding: '18px 22px', border: '1px solid rgba(255,255,255,.28)', borderRadius: '16px',
        color: '#fffaf0', background: 'rgba(20,55,45,.96)', boxShadow: '0 18px 50px rgba(16,36,30,.28)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', pointerEvents: 'none',
      })
      document.body.appendChild(node)
    }
    node.innerHTML = `<span style="display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#efbd69;color:#173c31;font-weight:850;font-size:16px">${step}</span><div><strong style="display:block;font-size:20px;line-height:1.2;letter-spacing:-.02em">${title}</strong><span style="display:block;margin-top:5px;font-size:13px;line-height:1.45;color:#dbe9e3">${body}</span></div>`
  }, { step, title, body })
}

try {
  let storageState = savedSession
  if (!storageState) {
    const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const authPage = await authContext.newPage()
    authPage.setDefaultTimeout(120_000)
    await authPage.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await authPage.getByRole('heading', { name: 'Create your private workspace' }).waitFor()
    await authPage.getByRole('button', { name: 'Already have an account? Sign in' }).click()
    await authPage.getByLabel('Email').fill(email)
    await authPage.getByLabel('Password').fill(password)
    await authPage.getByRole('button', { name: 'Sign in' }).click()
    await authPage.getByRole('heading', { name: /Sponsor workflow proof/ }).waitFor()
    storageState = await authContext.storageState()
    await authContext.close()
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState,
    recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByRole('heading', { name: /Sponsor workflow proof/ }).waitFor({ timeout: 90_000 })
  const video = page.video()

  await caption(page, '01', 'Room-specific evidence before booking', 'AccessRelay starts with a traveler’s real shortlist and their own measurements — never a generic accessibility score.')
  await pause(page, 8_000)

  await page.locator('.progress-card').scrollIntoViewIfNeeded()
  await caption(page, '02', 'Real inventory, strict unknowns', 'This Royal Lancaster property came from LiteAPI. Firecrawl read the official room page and found zero claims strong enough to publish.')
  await pause(page, 9_000)

  await page.locator('.comparison-table').scrollIntoViewIfNeeded()
  await caption(page, '03', 'The hotel fills only the gaps', 'The traveler reviewed one exact email. AgentMail delivered it and returned the reply on the same signed, deduplicated thread.')
  await pause(page, 8_000)

  await page.locator('button.finding-confirmed').first().click()
  await caption(page, '04', 'Every answer keeps its evidence', 'The model can propose a fact; deterministic checks require the exact quote, room scope, unit and approved sender before it enters the comparison.')
  await pause(page, 10_000)
  await page.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('tab', { name: /Activity/ }).click()
  await page.locator('.activity-panel').scrollIntoViewIfNeeded()
  await caption(page, '05', 'A reactive audit trail in Convex', 'Research, approval, delivery, reply receipt and five accepted statements appear live and remain separate from date-specific availability.')
  await pause(page, 11_000)

  await page.getByRole('tab', { name: /Compare hotels/ }).click()
  await page.locator('.comparison-table').scrollIntoViewIfNeeded()
  await caption(page, '06', 'Useful certainty without false confidence', 'This proof uses a controlled AgentMail hotel inbox to validate the workflow, not Royal Lancaster’s accessibility. Unknowns remain unknown.')
  await pause(page, 11_000)

  await page.evaluate(() => document.querySelector('#accessrelay-demo-caption')?.remove())
  await page.locator('.page-title').scrollIntoViewIfNeeded()
  await pause(page, 5_000)

  await page.close()
  await context.close()
  if (!video) throw new Error('Playwright did not create a video handle.')
  copyFileSync(await video.path(), 'artifacts/accessrelay-demo-silent.webm')
  console.log('Recorded artifacts/accessrelay-demo-silent.webm')
} finally {
  await browser.close()
}
