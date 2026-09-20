import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'
import { trip, researchState } from './validators'
import { inventoryHotel } from './inventoryValidators'

export default defineSchema({
  ...authTables,
  inventoryCache: defineTable({ key: v.string(), hotels: v.array(inventoryHotel), fetchedAt: v.number() }).index('by_key', ['key']),
  budgets: defineTable({ key: v.string(), day: v.string(), used: v.number() }).index('by_key_and_day', ['key', 'day']),
  trips: defineTable({ owner: v.id('users'), data: trip, updatedAt: v.number(), revision: v.number() }).index('by_owner', ['owner']),
  research: defineTable({ tripId: v.id('trips'), hotelId: v.string(), state: researchState, error: v.union(v.string(), v.null()), updatedAt: v.number(), revision: v.number() }).index('by_tripId', ['tripId']).index('by_tripId_and_hotelId', ['tripId', 'hotelId']),
  inquiries: defineTable({ tripId: v.id('trips'), hotelId: v.string(), recipient: v.string(), subject: v.string(), body: v.string(), tripRevision: v.number(), state: v.union(v.literal('draft'), v.literal('approved'), v.literal('sending'), v.literal('sent'), v.literal('uncertain'), v.literal('failed')), providerMessageId: v.union(v.string(), v.null()), providerThreadId: v.union(v.string(), v.null()), error: v.union(v.string(), v.null()), approvedAt: v.union(v.number(), v.null()), updatedAt: v.number() }).index('by_tripId', ['tripId']).index('by_tripId_and_hotelId', ['tripId', 'hotelId']).index('by_providerThreadId', ['providerThreadId']),
  events: defineTable({ tripId: v.id('trips'), kind: v.string(), message: v.string(), at: v.number() }).index('by_tripId', ['tripId']),
  received: defineTable({ providerMessageId: v.string(), inquiryId: v.id('inquiries'), sender: v.string(), body: v.string(), state: v.union(v.literal('received'), v.literal('processed'), v.literal('failed')), at: v.number() }).index('by_providerMessageId', ['providerMessageId']).index('by_inquiryId', ['inquiryId']),
})
