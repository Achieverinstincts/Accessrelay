// Prove the production Firecrawl + AgentMail workflow with a controlled AgentMail hotel inbox.
// The controlled reply is evidence of transport and verification behavior, not a real hotel statement.
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const publicUrl = process.env.ACCESSRELAY_PUBLIC_URL ?? 'https://accessrelay.emmanuelsekyi.chatgpt.site'
const keyFile = process.argv[2]
if (!keyFile || !existsSync(keyFile)) throw new Error('Pass the AgentMail API key file as the first argument.')
const setup = JSON.parse(readFileSync('artifacts/agentmail-setup.json', 'utf8'))
const rawKey = readFileSync(keyFile, 'utf8').trim()
const apiKey = rawKey.includes('=') ? rawKey.slice(rawKey.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : rawKey
if (!apiKey.startsWith('am_')) throw new Error('The AgentMail key file does not contain an expected API key.')

async function agentmail(path, options = {}) {
  const response = await fetch(`https://api.agentmail.to/v0${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`AgentMail ${options.method ?? 'GET'} request failed with HTTP ${response.status}.`)
  return response.status === 204 ? null : await response.json()
}

async function poll(fn, { timeoutMs = 90_000, intervalMs = 2_000, description }) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const value = await fn()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error(`${description} did not complete in time.${lastError instanceof Error ? ` ${lastError.message}` : ''}`)
}

const started = performance.now()
const stamp = Date.now()
const tripName = `Sponsor workflow proof ${stamp}`
const subject = `Controlled accessibility verification ${stamp}`
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const browserErrors = []

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.goto(publicUrl, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.getByRole('heading', { name: 'Create your private workspace' }).waitFor({ timeout: 60_000 })
  await page.getByLabel('Email').fill(`sponsor-proof-${stamp}@accessrelay.test`)
  await page.getByLabel('Password').fill(`Sponsor-${stamp}-verified!`)
  await page.getByRole('button', { name: /Create workspace/ }).click()
  await page.getByRole('heading', { name: 'Compare the rooms you are actually considering.' }).waitFor({ timeout: 90_000 })

  await page.getByRole('button', { name: 'Create your first trip' }).click()
  await page.getByLabel('Hotel name (optional)').fill('Royal Lancaster')
  await page.getByRole('button', { name: 'Find real hotels' }).click()
  await page.getByRole('heading', { name: 'Royal Lancaster London' }).waitFor({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Choose this hotel' }).click()
  await page.getByRole('group', { name: 'Royal Lancaster London' }).waitFor({ timeout: 90_000 })
  await page.getByLabel('Official hotel or room page').fill('https://www.royallancaster.com/rooms/deluxecorner')
  await page.getByLabel('Specific room type').fill('Deluxe Corner Room')
  await page.getByLabel('Trip name').fill(tripName)
  await page.getByLabel('Arrival').fill('2026-10-20')
  await page.getByLabel('Departure').fill('2026-10-22')
  await page.getByRole('button', { name: 'Create evidence comparison' }).click()
  await page.getByRole('heading', { name: tripName }).waitFor({ timeout: 90_000 })

  await page.getByRole('button', { name: 'Research page' }).first().click()
  await page.getByRole('tab', { name: /Activity/ }).click()
  const researchEventNode = page.locator('.activity-item strong').filter({ hasText: /Website research finished|Research could not be completed/ }).first()
  await researchEventNode.waitFor({ timeout: 180_000 })
  const researchEvent = (await researchEventNode.textContent())?.trim() ?? ''
  if (!researchEvent.startsWith('Website research finished')) throw new Error(`Production research failed: ${researchEvent}`)

  await page.getByRole('tab', { name: /Compare hotels/ }).click()
  await page.getByRole('button', { name: 'Review questions' }).first().click()
  await page.getByLabel('Hotel email').fill(setup.testEmail)
  await page.getByLabel('Subject').fill(subject)
  await page.getByLabel('I reviewed the recipient and message. Send this one email now.').check()
  await page.getByRole('button', { name: 'Approve and send once' }).click()
  await page.getByRole('tab', { name: /Activity/ }).click()
  const sentEventNode = page.locator('.activity-item strong').filter({ hasText: `Inquiry sent to ${setup.testEmail}` }).first()
  await sentEventNode.waitFor({ timeout: 180_000 })
  const sentEvent = (await sentEventNode.textContent())?.trim() ?? ''

  const receivedMessage = await poll(async () => {
    const params = new URLSearchParams({ limit: '20', subject })
    const payload = await agentmail(`/inboxes/${encodeURIComponent(setup.testInboxId)}/messages?${params}`)
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    return messages.find(message => message?.subject === subject && message?.thread_id && message?.message_id)
  }, { description: 'The controlled hotel inbox receiving the inquiry' })

  const replyText = [
    'For the Deluxe Corner Room, the clear doorway opening is 82 cm.',
    'The mattress top is 54 cm above the floor, and the clear transfer space beside the bed is 100 cm.',
    'There is a step-free route from the street entrance to the room and its bathroom.',
    'The room has a level-entry shower with no raised lip.',
    'The Deluxe Corner Room is available for your dates, 20 October 2026 through 22 October 2026.',
    'This is a controlled AccessRelay integration test reply, not a statement from Royal Lancaster London.',
  ].join('\n\n')
  const reply = await agentmail(`/inboxes/${encodeURIComponent(setup.testInboxId)}/messages/${encodeURIComponent(receivedMessage.message_id)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text: replyText, labels: ['accessrelay-controlled-test'] }),
  })
  if (typeof reply?.message_id !== 'string' || reply?.thread_id !== receivedMessage.thread_id) throw new Error('AgentMail did not preserve the controlled reply thread.')

  const processedEventNode = page.locator('.activity-item strong').filter({ hasText: /supported statements? added from the hotel reply/ }).first()
  await processedEventNode.waitFor({ timeout: 240_000 })
  const processedEvent = (await processedEventNode.textContent())?.trim() ?? ''
  const acceptedMatch = processedEvent.match(/^(\d+) supported/)
  const acceptedClaims = acceptedMatch ? Number(acceptedMatch[1]) : -1
  if (acceptedClaims < 4) throw new Error(`Too few controlled reply claims were accepted: ${processedEvent}`)

  mkdirSync('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/sponsor-e2e.png', fullPage: true })
  const artifact = {
    verifiedAt: new Date().toISOString(),
    publicUrl,
    productionConvex: 'https://lovable-flamingo-74.convex.cloud',
    inventoryProvider: 'LiteAPI sandbox',
    inventoryProperty: 'Royal Lancaster London',
    sourceUrl: 'https://www.royallancaster.com/rooms/deluxecorner',
    firecrawlComponent: '@firecrawl/firecrawl-convex',
    researchEvent,
    agentmailComponent: '@agentmail/convex',
    senderInbox: setup.primaryEmail,
    controlledRecipientInbox: setup.testEmail,
    outboundMessageId: receivedMessage.message_id,
    outboundThreadId: receivedMessage.thread_id,
    controlledReplyMessageId: reply.message_id,
    sentEvent,
    processedEvent,
    acceptedClaims,
    controlledTestDisclosure: 'The recipient and reply were a second AgentMail inbox controlled by AccessRelay. This proves transport, webhook, thread matching and evidence extraction; it is not real hotel feedback.',
    browserErrors,
    elapsedMs: Math.round(performance.now() - started),
    screenshot: 'artifacts/sponsor-e2e.png',
  }
  writeFileSync('artifacts/sponsor-e2e.json', `${JSON.stringify(artifact, null, 2)}\n`)
  console.log(JSON.stringify(artifact, null, 2))
} finally {
  await browser.close()
}
