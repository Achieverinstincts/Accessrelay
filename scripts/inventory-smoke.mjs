import { ConvexHttpClient } from 'convex/browser'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const config = readFileSync('.env.local', 'utf8')
const url = config.match(/^VITE_CONVEX_URL=(.*)$/m)?.[1]?.trim()
if (!url || !url.startsWith('http://127.0.0.1:')) throw new Error('Smoke test is local-only.')
const client = new ConvexHttpClient(url)
const signIn = await client.action('auth:signIn', { provider: 'password', params: { flow: 'signUp', email: `inventory-${Date.now()}@example.invalid`, password: randomBytes(24).toString('hex') } })
if (!signIn.tokens?.token) throw new Error('Local authentication did not return a session.')
client.setAuth(signIn.tokens.token)
try {
  const hotels = await client.action('inventory:search', { city: 'London', country: 'GB', name: 'Royal Lancaster' })
  if (!hotels.length) throw new Error('Search returned no real properties.')
  const hotel = await client.action('inventory:details', { providerId: hotels[0].providerId })
  if (!hotel.name || !hotel.photo || !hotel.rooms.length) throw new Error('Property metadata is incomplete for the test.')
  const id = await client.mutation('trips:create', { data: {
    title: 'Inventory integration verification', destination: `${hotel.city}, ${hotel.country}`, arrival: '2026-11-12', departure: '2026-11-15',
    requirements: { doorWidth: 80, bedMin: 45, bedMax: 55, transferSpace: 90, stepFree: true, rollInShower: true },
    hotels: [{ id: 'ignored-client-id', name: 'Untrusted client name', url: 'https://www.royallancaster.com/', room: hotel.rooms[0], email: '', location: '', inventory: hotel, evidence: [], availability: 'confirmed' }],
  } })
  const saved = await client.query('trips:get', { id })
  if (saved.data.hotels[0].name !== hotel.name || saved.data.hotels[0].availability !== 'unknown' || saved.data.hotels[0].evidence.length) throw new Error('Inventory/evidence trust boundary failed.')
  const report = { verifiedAt: new Date().toISOString(), backend: 'local Convex', property: hotel.name, providerId: hotel.providerId, photoPresent: !!hotel.photo, roomNames: hotel.rooms.length, persisted: true, clientNameOverridden: true, accessibilityEvidenceCount: 0, availability: 'unknown' }
  writeFileSync('artifacts/inventory-smoke.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await client.action('auth:signOut', {}).catch(() => {}) }
