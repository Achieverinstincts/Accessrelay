import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { verifySvixWebhook } from './webhookVerification'
import { readEnv } from './env'

const http = httpRouter()
auth.addHttpRoutes(http)

http.route({
  path: '/agentmail-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const declaredLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > 1_050_000) return new Response('Payload too large.', { status: 413 })
    const body = await request.text()
    if (body.length > 1_050_000) return new Response('Payload too large.', { status: 413 })
    const secret = readEnv('AGENTMAIL_WEBHOOK_SECRET')
    if (!secret) return new Response('Webhook is not configured.', { status: 503 })
    const verified = await verifySvixWebhook({
      secret,
      payload: body,
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    })
    if (!verified) return new Response('Invalid signature.', { status: 401 })

    let payload: unknown
    try { payload = JSON.parse(body) } catch { return new Response('Invalid JSON.', { status: 400 }) }
    if (!payload || typeof payload !== 'object') return new Response('Invalid event.', { status: 400 })
    const event = payload as { event_type?: unknown; message?: unknown }
    if (event.event_type !== 'message.received') return new Response('OK', { status: 200 })
    if (!event.message || typeof event.message !== 'object') return new Response('Invalid event.', { status: 400 })
    const message = event.message as { message_id?: unknown; thread_id?: unknown; inbox_id?: unknown; from_?: unknown; extracted_text?: unknown }
    if (message.inbox_id !== readEnv('AGENTMAIL_INBOX_ID')) return new Response('OK', { status: 200 })
    if (typeof message.message_id !== 'string' || typeof message.thread_id !== 'string') return new Response('Invalid event.', { status: 400 })
    const sender = Array.isArray(message.from_) && typeof message.from_[0] === 'string' ? message.from_[0] : ''
    const text = typeof message.extracted_text === 'string' ? message.extracted_text : ''
    await ctx.runMutation(internal.inquiries.receive, { providerMessageId: message.message_id, providerThreadId: message.thread_id, sender, body: text })
    return new Response('OK', { status: 200 })
  }),
})

export default http
