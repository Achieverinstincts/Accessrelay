import { ConvexHttpClient } from 'convex/browser'
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
const address = 'http://127.0.0.1:3210'
const client = new ConvexHttpClient(address)
const session = await client.action('auth:signIn', { provider: 'password', params: { flow: 'signUp', email: `browser-${Date.now()}@example.invalid`, password: randomBytes(20).toString('hex') } })
if (!session.tokens?.token || !session.tokens?.refreshToken) throw new Error('Local authentication did not produce a browser session.')
client.setAuth(session.tokens.token)
const hotels = await client.action('inventory:search', { city: 'London', country: 'GB', name: 'Royal Lancaster' })
if (!hotels[0]) throw new Error('Browser fixture search returned no property.')
const hotel = await client.action('inventory:details', { providerId: hotels[0].providerId })
if (!hotel.rooms[0]) throw new Error('Browser fixture property returned no room names.')
await client.mutation('trips:create', { data: {
  title: 'Real hotel verification', destination: `${hotel.city}, ${hotel.country}`, arrival: '2026-11-12', departure: '2026-11-15',
  requirements: { doorWidth: 80, bedMin: 45, bedMax: 55, transferSpace: 90, stepFree: true, rollInShower: true },
  hotels: [{ id: 'browser-fixture', name: hotel.name, url: 'https://www.royallancaster.com/', room: hotel.rooms[0], email: '', location: hotel.address, inventory: hotel, evidence: [], availability: 'unknown' }],
} })
mkdirSync('.convex', { recursive: true })
writeFileSync('.convex/browser-session.json', JSON.stringify({ address, token: session.tokens.token, refreshToken: session.tokens.refreshToken }))
console.log('Prepared an ignored, short-lived local browser session with one real provider-backed trip.')
