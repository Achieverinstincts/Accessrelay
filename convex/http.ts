import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { httpAction } from './_generated/server'
import { components, internal } from './_generated/api'
import { AgentMail } from '@agentmail/convex'

const http = httpRouter()
auth.addHttpRoutes(http)

const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.inquiries.onAgentMailMessageReceived,
})

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const declaredLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > 1_050_000) return new Response('Payload too large.', { status: 413 })
    return await agentmail.handleWebhook(
      ctx as unknown as Parameters<AgentMail['handleWebhook']>[0],
      request,
    )
  }),
})

export default http
