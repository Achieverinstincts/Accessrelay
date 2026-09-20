// Provision AccessRelay's free AgentMail inboxes and production webhook.
// Credential contents and webhook secrets are never printed or written to disk.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const keyFile = process.argv[2]
const webhookUrl = process.argv[3] ?? 'https://lovable-flamingo-74.convex.site/agentmail/webhook'
if (!keyFile || !existsSync(keyFile)) throw new Error('Pass the AgentMail API key file as the first argument.')
if (!/^https:\/\/[a-z0-9-]+\.convex\.site\/agentmail\/webhook$/.test(webhookUrl)) throw new Error('The webhook URL must be the production Convex AgentMail route.')

const rawKey = readFileSync(keyFile, 'utf8').trim()
const apiKey = rawKey.includes('=') ? rawKey.slice(rawKey.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : rawKey
if (!apiKey.startsWith('am_')) throw new Error('The AgentMail key file does not contain an expected API key.')

async function request(path, options = {}) {
  const response = await fetch(`https://api.agentmail.to/v0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`AgentMail ${options.method ?? 'GET'} ${path} failed with HTTP ${response.status}.`)
  if (response.status === 204) return null
  return await response.json()
}

function rows(payload, key) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload[key])) return payload[key]
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

async function ensureInbox({ clientId, username, fallbackUsername, displayName }) {
  const listed = rows(await request('/inboxes?limit=100'), 'inboxes')
  const existing = listed.find(inbox => inbox?.client_id === clientId)
  if (existing) return existing
  const create = async selectedUsername => await request('/inboxes', {
    method: 'POST',
    body: JSON.stringify({ username: selectedUsername, display_name: displayName, client_id: clientId }),
  })
  try {
    return await create(username)
  } catch (error) {
    if (!fallbackUsername || !(error instanceof Error) || !error.message.includes('HTTP 409')) throw error
    return await create(fallbackUsername)
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value) throw new Error(`AgentMail returned no ${label}.`)
  return value
}

function setProductionEnv(name, value) {
  const pkg = JSON.parse(readFileSync('node_modules/convex/package.json', 'utf8'))
  const cli = resolve('node_modules/convex', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.convex)
  const result = spawnSync(process.execPath, [cli, 'env', 'set', '--prod', name, value], {
    encoding: 'utf8',
    timeout: 240_000,
    windowsHide: true,
  })
  if (result.status !== 0) throw new Error(`${name} configuration failed (${result.error?.code ?? `exit ${result.status}`}).`)
}

const primary = await ensureInbox({
  clientId: 'accessrelay-production-inbox-v1',
  username: 'accessrelay',
  fallbackUsername: 'accessrelay-verification',
  displayName: 'AccessRelay Accessibility Desk',
})
const testHotel = await ensureInbox({
  clientId: 'accessrelay-test-hotel-v1',
  username: 'accessrelay-hotel-demo',
  fallbackUsername: 'accessrelay-hotel-verification',
  displayName: 'AccessRelay Test Hotel',
})
const primaryInboxId = requireString(primary.inbox_id, 'primary inbox ID')
const primaryEmail = requireString(primary.email, 'primary inbox address')
const testInboxId = requireString(testHotel.inbox_id, 'test inbox ID')
const testEmail = requireString(testHotel.email, 'test inbox address')

const webhook = await request(`/inboxes/${encodeURIComponent(primaryInboxId)}/webhooks`, {
  method: 'POST',
  body: JSON.stringify({
    url: webhookUrl,
    event_types: ['message.received'],
    client_id: 'accessrelay-production-webhook-v1',
  }),
})
const webhookId = requireString(webhook?.webhook_id, 'webhook ID')
const webhookSecret = requireString(webhook?.secret, 'webhook signing secret')

setProductionEnv('AGENTMAIL_INBOX_ID', primaryInboxId)
setProductionEnv('AGENTMAIL_WEBHOOK_SECRET', webhookSecret)

const evidencePath = resolve('artifacts/agentmail-setup.json')
mkdirSync(dirname(evidencePath), { recursive: true })
writeFileSync(evidencePath, `${JSON.stringify({
  primaryInboxId,
  primaryEmail,
  testInboxId,
  testEmail,
  webhookId,
  webhookUrl,
  eventTypes: ['message.received'],
  configuredAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log(`Primary inbox: ${primaryEmail}`)
console.log(`Controlled test hotel inbox: ${testEmail}`)
console.log(`Signed message.received webhook: ${webhookUrl}`)
console.log('AGENTMAIL_INBOX_ID and AGENTMAIL_WEBHOOK_SECRET: configured on production Convex.')
