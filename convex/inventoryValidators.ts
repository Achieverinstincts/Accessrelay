import { v } from 'convex/values'
export const inventoryHotel = v.object({
  provider: v.literal('liteapi'), environment: v.literal('sandbox'), providerId: v.string(),
  name: v.string(), address: v.string(), city: v.string(), country: v.string(),
  latitude: v.union(v.number(), v.null()), longitude: v.union(v.number(), v.null()),
  photo: v.string(), stars: v.union(v.number(), v.null()), rooms: v.array(v.string()), fetchedAt: v.number(),
})
