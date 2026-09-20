import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { query, mutation } from './_generated/server'
import { trip, requirements } from './validators'
import { validateTrip } from '../src/domain'

export const list = query({ args: {}, returns: v.array(v.object({ id: v.id('trips'), title: v.string(), destination: v.string(), updatedAt: v.number() })), handler: async ctx => {
  const owner = await getAuthUserId(ctx)
  if (!owner) return []
  return (await ctx.db.query('trips').withIndex('by_owner', q => q.eq('owner', owner)).order('desc').take(30)).map(t => ({ id: t._id, title: t.data.title, destination: t.data.destination, updatedAt: t.updatedAt }))
} })
export const get = query({ args: { id: v.id('trips') }, returns: v.union(v.null(), v.object({ data: trip, revision: v.number() })), handler: async (ctx, { id }) => {
  const owner = await getAuthUserId(ctx), row = await ctx.db.get(id)
  return owner && row?.owner === owner ? { data: row.data, revision: row.revision } : null
} })
export const create = mutation({ args: { data: trip }, returns: v.id('trips'), handler: async (ctx, { data }) => {
  const owner = await getAuthUserId(ctx)
  if (!owner) throw new ConvexError('Sign in to save a trip.')
  const issue = validateTrip(data)
  if (issue) throw new ConvexError(issue)
  if ((await ctx.db.query('trips').withIndex('by_owner', q => q.eq('owner', owner)).take(31)).length >= 30) throw new ConvexError('The preview supports up to 30 trips per account.')
  if (JSON.stringify(data).length > 20000) throw new ConvexError('Trip details are too long.')
  // A browser cannot create hotel confirmations or supply its own researched evidence.
  const hotels = []
  for (const [i, h] of data.hotels.entries()) {
    const cached = h.inventory ? await ctx.db.query('inventoryCache').withIndex('by_key', q => q.eq('key', `hotel:${h.inventory!.providerId}`)).unique() : null
    const inventory = cached?.hotels[0]
    if (h.inventory && (!inventory || cached!.fetchedAt < Date.now() - 86_400_000)) throw new ConvexError('Refresh the hotel details before saving this trip.')
    hotels.push({ id: `hotel-${i}`, name: inventory?.name ?? h.name.trim(), room: h.room.trim(), url: h.url, location: inventory ? `${inventory.address}, ${inventory.city}, ${inventory.country}` : h.location, email: '', evidence: [], availability: 'unknown' as const, ...(inventory ? { inventory } : {}) })
  }
  const clean = { ...data, hotels }
  const id = await ctx.db.insert('trips', { owner, data: clean, revision: 1, updatedAt: Date.now() })
  await ctx.db.insert('events', { tripId: id, kind: 'created', message: 'Trip created. Hotel evidence has not been collected yet.', at: Date.now() })
  return id
} })
export const updateRequirements = mutation({ args: { id: v.id('trips'), requirements, revision: v.number() }, returns: v.null(), handler: async (ctx, args) => {
  const owner = await getAuthUserId(ctx), row = await ctx.db.get(args.id)
  if (!owner || row?.owner !== owner) throw new ConvexError('Trip not found.')
  if (row.revision !== args.revision) throw new ConvexError('This trip changed in another tab. Review the latest version and try again.')
  const data = { ...row.data, requirements: args.requirements }, issue = validateTrip(data)
  if (issue) throw new ConvexError(issue)
  await ctx.db.patch(row._id, { data, revision: row.revision + 1, updatedAt: Date.now() })
  await ctx.db.insert('events', { tripId: row._id, kind: 'requirements', message: 'Requirements changed. Comparisons recalculated; earlier inquiry approvals must be reviewed again.', at: Date.now() })
  return null
} })
