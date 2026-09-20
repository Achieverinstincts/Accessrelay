import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { internal } from './_generated/api'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { evidence, hotel, researchState } from './validators'
import type { Id } from './_generated/dataModel'
import { readEnv } from './env'

export const request = mutation({
  args: { tripId: v.id('trips'), hotelId: v.string() },
  returns: v.id('research'),
  handler: async (ctx, args): Promise<Id<'research'>> => {
    const owner = await getAuthUserId(ctx)
    const trip = await ctx.db.get(args.tripId)
    if (!owner || trip?.owner !== owner) throw new ConvexError('Trip not found.')
    if (!readEnv('FIRECRAWL_API_KEY') || !readEnv('GROQ_API_KEY')) throw new ConvexError('Live research is not connected yet.')
    if (!trip.data.hotels.some((h) => h.id === args.hotelId)) throw new ConvexError('Hotel not found.')

    const previous = await ctx.db
      .query('research')
      .withIndex('by_tripId_and_hotelId', (q) => q.eq('tripId', args.tripId).eq('hotelId', args.hotelId))
      .order('desc')
      .first()
    if (previous && ['queued', 'running'].includes(previous.state)) return previous._id

    const day = new Date().toISOString().slice(0, 10)
    for (const [key, limit] of [[`research:${owner}`, 6], ['research:all', 30]] as const) {
      const budget = await ctx.db.query('budgets').withIndex('by_key_and_day', (q) => q.eq('key', key).eq('day', day)).unique()
      if (budget && budget.used >= limit) throw new ConvexError('The free preview’s daily research limit has been reached. Try again tomorrow.')
      if (budget) await ctx.db.patch(budget._id, { used: budget.used + 1 })
      else await ctx.db.insert('budgets', { key, day, used: 1 })
    }

    const jobId = await ctx.db.insert('research', { ...args, state: 'queued', error: null, updatedAt: Date.now(), revision: trip.revision })
    await ctx.scheduler.runAfter(0, internal.researchActions.extract, { jobId })
    return jobId
  },
})

export const status = query({
  args: { tripId: v.id('trips') },
  returns: v.array(v.object({ id: v.id('research'), hotelId: v.string(), state: researchState, error: v.union(v.string(), v.null()) })),
  handler: async (ctx, { tripId }) => {
    const owner = await getAuthUserId(ctx)
    const trip = await ctx.db.get(tripId)
    if (!owner || trip?.owner !== owner) return []
    return (await ctx.db.query('research').withIndex('by_tripId', (q) => q.eq('tripId', tripId)).order('desc').take(30))
      .map((job) => ({ id: job._id, hotelId: job.hotelId, state: job.state, error: job.error }))
  },
})

export const context = internalQuery({
  args: { jobId: v.id('research') },
  returns: v.union(v.null(), v.object({ hotel, state: researchState })),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    if (!job) return null
    const trip = await ctx.db.get(job.tripId)
    const selected = trip?.data.hotels.find((h) => h.id === job.hotelId)
    return selected ? { hotel: selected, state: job.state } : null
  },
})

export const setRunning = internalMutation({
  args: { jobId: v.id('research') },
  returns: v.boolean(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    if (!job || job.state !== 'queued') return false
    await ctx.db.patch(jobId, { state: 'running', updatedAt: Date.now() })
    return true
  },
})

export const finish = internalMutation({
  args: { jobId: v.id('research'), claims: v.array(evidence), error: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, { jobId, claims, error }) => {
    const job = await ctx.db.get(jobId)
    if (!job || ['complete', 'failed'].includes(job.state)) return null
    const trip = await ctx.db.get(job.tripId)
    if (!trip) return null
    await ctx.db.patch(jobId, { state: error ? 'failed' : 'complete', error, updatedAt: Date.now() })
    if (!error) {
      const data = {
        ...trip.data,
        hotels: trip.data.hotels.map((h) => h.id !== job.hotelId ? h : {
          ...h,
          evidence: [...claims.slice(-20), ...h.evidence.filter((item) => item.source === 'hotel').slice(-20)],
        }),
      }
      await ctx.db.patch(trip._id, { data, revision: trip.revision + 1, updatedAt: Date.now() })
    }
    await ctx.db.insert('events', {
      tripId: trip._id,
      kind: error ? 'research_failed' : 'researched',
      message: error ?? `Website research finished with ${claims.length} source-grounded claims. Missing details remain unknown.`,
      at: Date.now(),
    })
    return null
  },
})
