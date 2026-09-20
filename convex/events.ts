import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { query } from './_generated/server'

export const list = query({
  args: { tripId: v.id('trips') },
  returns: v.array(v.object({ id: v.id('events'), kind: v.string(), message: v.string(), at: v.number() })),
  handler: async (ctx, { tripId }) => {
    const owner = await getAuthUserId(ctx)
    const trip = await ctx.db.get(tripId)
    if (!owner || trip?.owner !== owner) return []
    return (await ctx.db.query('events').withIndex('by_tripId', q => q.eq('tripId', tripId)).order('desc').take(50)).map(event => ({ id: event._id, kind: event.kind, message: event.message, at: event.at }))
  },
})
