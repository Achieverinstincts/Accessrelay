import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifySvixWebhook } from '../convex/webhookVerification.ts'

async function signature(secretBytes, id, timestamp, payload) {
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`)))
  return `v1,${Buffer.from(digest).toString('base64')}`
}

test('verifies a valid Svix signature over the exact raw body', async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = `whsec_${Buffer.from(bytes).toString('base64')}`
  const id = 'msg_test_123', timestamp = '1789291200', payload = '{"event_type":"message.received"}'
  assert.equal(await verifySvixWebhook({ secret, id, timestamp, payload, signature: await signature(bytes, id, timestamp, payload), nowSeconds: 1789291200 }), true)
})

test('rejects tampering, expired timestamps, and missing headers', async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = `whsec_${Buffer.from(bytes).toString('base64')}`
  const id = 'msg_test_123', timestamp = '1789291200', payload = '{}'
  const signed = await signature(bytes, id, timestamp, payload)
  assert.equal(await verifySvixWebhook({ secret, id, timestamp, payload: '{"changed":true}', signature: signed, nowSeconds: 1789291200 }), false)
  assert.equal(await verifySvixWebhook({ secret, id, timestamp, payload, signature: signed, nowSeconds: 1789291801 }), false)
  assert.equal(await verifySvixWebhook({ secret, id: null, timestamp, payload, signature: signed, nowSeconds: 1789291200 }), false)
})
