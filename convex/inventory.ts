import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { inventoryHotel } from './inventoryValidators'
import { normalizeHotel, readInventoryResponse, type InventoryHotel } from '../src/inventory'
import { readEnv } from './env'

export const cached = internalQuery({ args: { key: v.string() }, returns: v.union(v.null(), v.array(inventoryHotel)), handler: async (ctx, { key }) => {
  const row = await ctx.db.query('inventoryCache').withIndex('by_key', q => q.eq('key', key)).unique()
  return row && row.fetchedAt > Date.now() - 86_400_000 ? row.hotels : null
} })
export const remember = internalMutation({ args: { key: v.string(), hotels: v.array(inventoryHotel) }, returns: v.null(), handler: async (ctx, args) => {
  const row = await ctx.db.query('inventoryCache').withIndex('by_key', q => q.eq('key', args.key)).unique()
  const data = { ...args, fetchedAt: Date.now() }
  if (row) await ctx.db.patch(row._id, data); else await ctx.db.insert('inventoryCache', data)
  return null
} })
export const reserve = internalMutation({ args: { owner: v.id('users') }, returns: v.null(), handler: async (ctx, { owner }) => {
  const day = new Date().toISOString().slice(0, 10)
  for (const [key, limit] of [[`inventory:${owner}`, 30], ['inventory:all', 100]] as const) {
    const row = await ctx.db.query('budgets').withIndex('by_key_and_day', q => q.eq('key', key).eq('day', day)).unique()
    if (row && row.used >= limit) throw new ConvexError('The free preview hotel lookup limit has been reached. Try tomorrow.')
    if (row) await ctx.db.patch(row._id, { used: row.used + 1 }); else await ctx.db.insert('budgets', { key, day, used: 1 })
  }
  return null
} })

// Only static sandbox content endpoints. No places, rates, bookings or paid add-ons.
async function request(path: string, params: URLSearchParams): Promise<unknown> {
  const key = readEnv('LITEAPI_SANDBOX_PRIVATE_KEY')
  if (!key) throw new ConvexError('Hotel discovery is not connected. You can still add an official hotel page manually.')
  try {
    return await readInventoryResponse(await fetch(`https://api.liteapi.travel/v3.0/data/${path}?${params}`, {
      headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(30_000), redirect: 'error',
    }))
  } catch { throw new ConvexError('Hotel discovery is temporarily unavailable. Retry later or add an official hotel page manually.') }
}
export const search = action({ args: { city: v.string(), country: v.string(), name: v.optional(v.string()), offset: v.optional(v.number()) }, returns: v.array(inventoryHotel), handler: async (ctx, args): Promise<InventoryHotel[]> => {
  const owner = await getAuthUserId(ctx)
  if (!owner) throw new ConvexError('Sign in to discover hotels.')
  const city = args.city.trim(), country = args.country.trim().toUpperCase(), name = (args.name ?? '').trim(), offset = args.offset ?? 0
  if (!city || city.length > 100 || !/^[A-Z]{2}$/.test(country) || name.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100) throw new ConvexError('Enter a city and two-letter country code.')
  const params = new URLSearchParams({ countryCode: country, cityName: city, limit: '12', offset: String(offset) })
  if (name) params.set('hotelName', name)
  const cacheKey = `search:${params.toString().toLowerCase()}`
  const cached: InventoryHotel[] | null = await ctx.runQuery(internal.inventory.cached, { key: cacheKey })
  if (cached) return cached
  await ctx.runMutation(internal.inventory.reserve, { owner })
  const payload = await request('hotels', params) as { data?: unknown[] }
  if (!Array.isArray(payload.data)) throw new ConvexError('Hotel provider returned an unexpected result. No sample hotels were substituted.')
  const hotels = payload.data.slice(0, 12).map(item => normalizeHotel(item, Date.now())).filter((item): item is InventoryHotel => item !== null)
  await ctx.runMutation(internal.inventory.remember, { key: cacheKey, hotels })
  return hotels
} })
export const details = action({ args: { providerId: v.string() }, returns: inventoryHotel, handler: async (ctx, { providerId }): Promise<InventoryHotel> => {
  const owner = await getAuthUserId(ctx)
  if (!owner) throw new ConvexError('Sign in to view hotel details.')
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(providerId)) throw new ConvexError('Invalid hotel identifier.')
  const key = `hotel:${providerId}`
  const cached: InventoryHotel[] | null = await ctx.runQuery(internal.inventory.cached, { key })
  if (cached?.[0]) return cached[0]
  await ctx.runMutation(internal.inventory.reserve, { owner })
  const payload = await request('hotel', new URLSearchParams({ hotelId: providerId })) as { data?: unknown }
  const hotel = normalizeHotel(payload.data, Date.now())
  if (!hotel || hotel.providerId !== providerId) throw new ConvexError('Hotel details could not be matched. Nothing was added.')
  await ctx.runMutation(internal.inventory.remember, { key, hotels: [hotel] })
  return hotel
} })
