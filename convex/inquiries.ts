import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { AgentMail, type OutboundId } from '@agentmail/convex'
import { components, internal } from './_generated/api'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { evidence } from './validators'
import { readEnv } from './env'

const agentmail = new AgentMail(components.agentmail, {
  retryAttempts: 3,
  initialBackoffMs: 10_000,
})

const inquiryState = v.union(v.literal('draft'), v.literal('approved'), v.literal('sending'), v.literal('sent'), v.literal('uncertain'), v.literal('failed'))
const summary = v.object({
  id: v.id('inquiries'),
  hotelId: v.string(),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  tripRevision: v.number(),
  state: inquiryState,
  providerThreadId: v.union(v.string(), v.null()),
  error: v.union(v.string(), v.null()),
  updatedAt: v.number(),
})

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null
}

function firstAddress(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

export const list = query({
  args: { tripId: v.id('trips') },
  returns: v.array(summary),
  handler: async (ctx, { tripId }) => {
    const owner = await getAuthUserId(ctx)
    const trip = await ctx.db.get(tripId)
    if (!owner || trip?.owner !== owner) return []
    return (await ctx.db.query('inquiries').withIndex('by_tripId', q => q.eq('tripId', tripId)).order('desc').take(30)).map(row => ({
      id: row._id,
      hotelId: row.hotelId,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      tripRevision: row.tripRevision,
      state: row.state,
      providerThreadId: row.providerThreadId,
      error: row.error,
      updatedAt: row.updatedAt,
    }))
  },
})

export const saveDraft = mutation({
  args: { tripId: v.id('trips'), hotelId: v.string(), recipient: v.string(), subject: v.string(), body: v.string(), tripRevision: v.number() },
  returns: v.id('inquiries'),
  handler: async (ctx, args) => {
    const owner = await getAuthUserId(ctx)
    const trip = await ctx.db.get(args.tripId)
    if (!owner || trip?.owner !== owner) throw new ConvexError('Trip not found.')
    if (trip.revision !== args.tripRevision) throw new ConvexError('This trip changed. Review the latest evidence before approving an email.')
    if (!trip.data.hotels.some(hotel => hotel.id === args.hotelId)) throw new ConvexError('Hotel not found.')
    const recipient = args.recipient.trim().toLowerCase()
    const subject = args.subject.trim()
    const body = args.body.trim()
    if (!validEmail(recipient)) throw new ConvexError('Enter a valid hotel email address.')
    if (!subject || subject.length > 180) throw new ConvexError('The subject must be between 1 and 180 characters.')
    if (!body || body.length > 12_000) throw new ConvexError('The message must be between 1 and 12,000 characters.')

    const history = await ctx.db.query('inquiries').withIndex('by_tripId_and_hotelId', q => q.eq('tripId', args.tripId).eq('hotelId', args.hotelId)).order('desc').take(10)
    const previous = history[0]
    if (previous && ['approved', 'sending'].includes(previous.state)) throw new ConvexError('An approved message is already being sent.')
    if (previous?.state === 'uncertain') throw new ConvexError('The previous delivery is uncertain. Check AgentMail before preparing another message.')
    if (history.filter(item => ['approved', 'sending', 'sent', 'uncertain'].includes(item.state)).length >= 2) throw new ConvexError('This preview allows one initial inquiry and one follow-up per hotel.')
    const now = Date.now()
    if (previous && ['draft', 'failed'].includes(previous.state)) {
      await ctx.db.patch(previous._id, { recipient, subject, body, tripRevision: trip.revision, state: 'draft', providerOutboundId: null, providerMessageId: null, providerThreadId: null, error: null, approvedAt: null, updatedAt: now })
      return previous._id
    }
    return await ctx.db.insert('inquiries', { tripId: args.tripId, hotelId: args.hotelId, recipient, subject, body, tripRevision: trip.revision, state: 'draft', providerOutboundId: null, providerMessageId: null, providerThreadId: null, error: null, approvedAt: null, updatedAt: now })
  },
})

export const approveAndSend = mutation({
  args: { inquiryId: v.id('inquiries') },
  returns: v.null(),
  handler: async (ctx, { inquiryId }) => {
    const owner = await getAuthUserId(ctx)
    const inquiry = await ctx.db.get(inquiryId)
    const trip = inquiry ? await ctx.db.get(inquiry.tripId) : null
    if (!owner || !inquiry || trip?.owner !== owner) throw new ConvexError('Inquiry not found.')
    if (inquiry.state !== 'draft') throw new ConvexError('Only a reviewed draft can be approved.')
    if (inquiry.tripRevision !== trip.revision) throw new ConvexError('Trip evidence or requirements changed. Review a fresh draft before sending.')
    if (!readEnv('AGENTMAIL_API_KEY') || !readEnv('AGENTMAIL_INBOX_ID')) throw new ConvexError('Hotel email is not connected yet.')

    const day = new Date().toISOString().slice(0, 10)
    for (const [key, limit] of [[`inquiry:${owner}`, 3], ['inquiry:all', 20]] as const) {
      const budget = await ctx.db.query('budgets').withIndex('by_key_and_day', q => q.eq('key', key).eq('day', day)).unique()
      if (budget && budget.used >= limit) throw new ConvexError('The free preview’s daily email limit has been reached. Try again tomorrow.')
      if (budget) await ctx.db.patch(budget._id, { used: budget.used + 1 })
      else await ctx.db.insert('budgets', { key, day, used: 1 })
    }

    const outboundId = await agentmail.sendMessage(ctx, readEnv('AGENTMAIL_INBOX_ID')!, {
      to: inquiry.recipient,
      subject: inquiry.subject,
      text: inquiry.body,
      labels: ['accessrelay', 'hotel-accessibility'],
      headers: { 'X-AccessRelay-Inquiry': String(inquiryId) },
    })
    const now = Date.now()
    await ctx.db.patch(inquiry._id, { state: 'sending', providerOutboundId: String(outboundId), approvedAt: now, error: null, updatedAt: now })
    await ctx.db.insert('events', { tripId: inquiry.tripId, kind: 'inquiry-approved', message: 'You approved one hotel inquiry. Delivery is being confirmed.', at: now })
    await ctx.scheduler.runAfter(2_000, internal.inquiries.reconcileDelivery, { inquiryId, attempt: 0 })
    return null
  },
})

export const markSent = internalMutation({
  args: { inquiryId: v.id('inquiries'), messageId: v.string(), threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const inquiry = await ctx.db.get(args.inquiryId)
    if (!inquiry || inquiry.state !== 'sending') return null
    const now = Date.now()
    await ctx.db.patch(inquiry._id, { state: 'sent', providerMessageId: args.messageId, providerThreadId: args.threadId, error: null, updatedAt: now })
    await ctx.db.insert('events', { tripId: inquiry.tripId, kind: 'inquiry-sent', message: `Inquiry sent to ${inquiry.recipient}. Waiting for the hotel’s reply.`, at: now })
    return null
  },
})

export const markSendProblem = internalMutation({
  args: { inquiryId: v.id('inquiries'), uncertain: v.boolean(), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const inquiry = await ctx.db.get(args.inquiryId)
    if (!inquiry || inquiry.state !== 'sending') return null
    const now = Date.now()
    await ctx.db.patch(inquiry._id, { state: args.uncertain ? 'uncertain' : 'failed', error: args.message.slice(0, 500), updatedAt: now })
    await ctx.db.insert('events', { tripId: inquiry.tripId, kind: args.uncertain ? 'inquiry-uncertain' : 'inquiry-failed', message: args.message.slice(0, 500), at: now })
    return null
  },
})

export const reconcileDelivery = internalMutation({
  args: { inquiryId: v.id('inquiries'), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { inquiryId, attempt }) => {
    const inquiry = await ctx.db.get(inquiryId)
    if (!inquiry || inquiry.state !== 'sending') return null
    const outboundId = inquiry.providerOutboundId
    if (typeof outboundId !== 'string') {
      await ctx.runMutation(internal.inquiries.markSendProblem, { inquiryId, uncertain: false, message: 'The email queue record is missing. Nothing was sent.' })
      return null
    }

    const status = await agentmail.status(ctx, outboundId as OutboundId)
    if (status && ['sent', 'delivered'].includes(status.status) && status.agentmailMessageId && status.threadId) {
      await ctx.runMutation(internal.inquiries.markSent, { inquiryId, messageId: status.agentmailMessageId, threadId: status.threadId })
      return null
    }
    if (status && ['failed', 'bounced', 'complained', 'rejected'].includes(status.status)) {
      await ctx.runMutation(internal.inquiries.markSendProblem, { inquiryId, uncertain: false, message: 'AgentMail could not deliver this inquiry. Review the address before trying again.' })
      return null
    }
    if (attempt < 18) {
      await ctx.scheduler.runAfter(10_000, internal.inquiries.reconcileDelivery, { inquiryId, attempt: attempt + 1 })
      return null
    }
    await ctx.runMutation(internal.inquiries.markSendProblem, { inquiryId, uncertain: true, message: 'The provider did not return a final result. Check the AgentMail inbox before sending again because the message may already have been sent.' })
    return null
  },
})

export const onAgentMailMessageReceived = internalMutation({
  args: { message: v.any(), thread: v.any(), eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, { message, eventId }) => {
    const payload = record(message)
    const inbox = readEnv('AGENTMAIL_INBOX_ID')
    if (!payload || !eventId || !inbox || payload.inbox_id !== inbox) return null
    if (typeof payload.message_id !== 'string' || typeof payload.thread_id !== 'string') return null
    const sender = firstAddress(payload.from_ ?? payload.from)
    const body = typeof payload.extracted_text === 'string'
      ? payload.extracted_text
      : typeof payload.text === 'string'
        ? payload.text
        : ''
    await ctx.runMutation(internal.inquiries.receive, {
      providerMessageId: payload.message_id,
      providerThreadId: payload.thread_id,
      sender,
      body,
    })
    return null
  },
})

export const receive = internalMutation({
  args: { providerMessageId: v.string(), providerThreadId: v.string(), sender: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.query('received').withIndex('by_providerMessageId', q => q.eq('providerMessageId', args.providerMessageId)).unique()) return null
    const inquiry = await ctx.db.query('inquiries').withIndex('by_providerThreadId', q => q.eq('providerThreadId', args.providerThreadId)).first()
    if (!inquiry || inquiry.state !== 'sent') return null
    const now = Date.now()
    const receivedId = await ctx.db.insert('received', { providerMessageId: args.providerMessageId, inquiryId: inquiry._id, sender: args.sender.slice(0, 320), body: args.body.slice(0, 20_000), state: 'received', at: now })
    await ctx.db.insert('events', { tripId: inquiry.tripId, kind: 'reply-received', message: 'A hotel reply arrived. AccessRelay is checking each statement against the original message.', at: now })
    await ctx.scheduler.runAfter(0, internal.inquiryActions.interpretReply, { receivedId })
    return null
  },
})

export const replyContext = internalQuery({
  args: { receivedId: v.id('received') },
  returns: v.union(v.null(), v.object({ receivedId: v.id('received'), providerMessageId: v.string(), providerThreadId: v.string(), sender: v.string(), recipient: v.string(), body: v.string(), inquiryId: v.id('inquiries'), tripId: v.id('trips'), hotelId: v.string(), hotel: v.string(), room: v.string(), arrival: v.string(), departure: v.string() })),
  handler: async (ctx, { receivedId }) => {
    const received = await ctx.db.get(receivedId)
    if (!received || received.state !== 'received') return null
    const inquiry = await ctx.db.get(received.inquiryId)
    const trip = inquiry ? await ctx.db.get(inquiry.tripId) : null
    const hotel = trip?.data.hotels.find(candidate => candidate.id === inquiry?.hotelId)
    if (!inquiry || !trip || !hotel) return null
    if (!inquiry.providerThreadId) return null
    return { receivedId, providerMessageId: received.providerMessageId, providerThreadId: inquiry.providerThreadId, sender: received.sender, recipient: inquiry.recipient, body: received.body, inquiryId: inquiry._id, tripId: trip._id, hotelId: hotel.id, hotel: hotel.name, room: hotel.room, arrival: trip.data.arrival, departure: trip.data.departure }
  },
})

export const storeFetchedReply = internalMutation({
  args: { receivedId: v.id('received'), sender: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const received = await ctx.db.get(args.receivedId)
    if (received?.state === 'received') await ctx.db.patch(received._id, { sender: args.sender.slice(0, 320), body: args.body.slice(0, 20_000) })
    return null
  },
})

export const finishReply = internalMutation({
  args: { receivedId: v.id('received'), claims: v.array(evidence), availability: v.object({ state: v.union(v.literal('unknown'), v.literal('confirmed'), v.literal('unavailable')), quote: v.optional(v.string()) }) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const received = await ctx.db.get(args.receivedId)
    const inquiry = received ? await ctx.db.get(received.inquiryId) : null
    const trip = inquiry ? await ctx.db.get(inquiry.tripId) : null
    if (!received || received.state !== 'received' || !inquiry || !trip) return null
    const hotelIndex = trip.data.hotels.findIndex(hotel => hotel.id === inquiry.hotelId)
    if (hotelIndex < 0) return null
    const hotel = trip.data.hotels[hotelIndex]
    const known = new Set(hotel.evidence.map(item => `${item.feature}:${item.value}:${item.quote.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()}`))
    const additions = args.claims.filter(item => !known.has(`${item.feature}:${item.value}:${item.quote.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()}`))
    const published = hotel.evidence.filter(item => item.source === 'published').slice(-20)
    const hotelStatements = [...hotel.evidence.filter(item => item.source === 'hotel'), ...additions].slice(-20)
    const nextHotel = {
      ...hotel,
      evidence: [...published, ...hotelStatements],
      ...(args.availability.state === 'unknown' ? {} : { availability: args.availability.state, availabilityNote: args.availability.quote }),
    }
    const hotels = [...trip.data.hotels]
    hotels[hotelIndex] = nextHotel
    const now = Date.now()
    await ctx.db.patch(trip._id, { data: { ...trip.data, hotels }, revision: trip.revision + 1, updatedAt: now })
    await ctx.db.patch(received._id, { state: 'processed' })
    const count = additions.length
    const availabilityMessage = args.availability.state === 'unknown' ? 'Availability is still unknown.' : `Availability is ${args.availability.state}.`
    await ctx.db.insert('events', { tripId: trip._id, kind: 'reply-processed', message: `${count} supported ${count === 1 ? 'statement' : 'statements'} added from the hotel reply. ${availabilityMessage}`, at: now })
    return null
  },
})

export const failReply = internalMutation({
  args: { receivedId: v.id('received'), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const received = await ctx.db.get(args.receivedId)
    if (!received || received.state !== 'received') return null
    const inquiry = await ctx.db.get(received.inquiryId)
    await ctx.db.patch(received._id, { state: 'failed' })
    if (inquiry) await ctx.db.insert('events', { tripId: inquiry.tripId, kind: 'reply-failed', message: (args.reason ?? 'The hotel reply was saved, but its statements could not be interpreted automatically.').slice(0, 500), at: Date.now() })
    return null
  },
})
