import { v } from 'convex/values'
import { inventoryHotel } from './inventoryValidators'
export const feature = v.union(v.literal('doorWidth'), v.literal('bedHeight'), v.literal('stepFree'), v.literal('rollInShower'), v.literal('transferSpace'))
export const requirements = v.object({ doorWidth: v.number(), bedMin: v.number(), bedMax: v.number(), stepFree: v.boolean(), rollInShower: v.boolean(), transferSpace: v.number() })
export const evidence = v.object({ id: v.string(), feature, value: v.union(v.number(), v.boolean()), quote: v.string(), source: v.union(v.literal('published'), v.literal('hotel')), sourceLabel: v.string(), url: v.optional(v.string()), room: v.string(), recordedAt: v.string(), unit: v.optional(v.literal('cm')), supersedes: v.optional(v.string()) })
export const hotel = v.object({ id: v.string(), name: v.string(), url: v.string(), room: v.string(), email: v.string(), location: v.string(), evidence: v.array(evidence), availability: v.union(v.literal('unknown'), v.literal('confirmed'), v.literal('unavailable')), availabilityNote: v.optional(v.string()), inventory: v.optional(inventoryHotel) })
export const trip = v.object({ title: v.string(), destination: v.string(), arrival: v.string(), departure: v.string(), requirements, hotels: v.array(hotel) })
export const researchState = v.union(v.literal('idle'), v.literal('queued'), v.literal('running'), v.literal('complete'), v.literal('failed'))
