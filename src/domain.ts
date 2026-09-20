import { isPublicHotelUrl } from './urlSafety.ts'
import type { InventoryHotel } from './inventory'
export { isPublicHotelUrl } from './urlSafety.ts'

export const featureKeys = ['doorWidth', 'bedHeight', 'stepFree', 'rollInShower', 'transferSpace'] as const
export type FeatureKey = typeof featureKeys[number]
export type Requirements = { doorWidth: number; bedMin: number; bedMax: number; stepFree: boolean; rollInShower: boolean; transferSpace: number }
export type Evidence = {
  id: string; feature: FeatureKey; value: number | boolean; quote: string;
  source: 'published' | 'hotel'; sourceLabel: string; url?: string;
  room: string; recordedAt: string; unit?: 'cm'; supersedes?: string;
}
export type Hotel = { id: string; name: string; url: string; room: string; email: string; location: string; evidence: Evidence[]; availability: 'unknown' | 'confirmed' | 'unavailable'; availabilityNote?: string; inventory?: InventoryHotel }
export type Trip = { title: string; destination: string; arrival: string; departure: string; requirements: Requirements; hotels: Hotel[] }
export type Finding = { state: 'not-required' | 'unknown' | 'conflict' | 'mismatch' | 'published' | 'confirmed'; label: string; detail: string; sources: Evidence[] }
export const featureLabels: Record<FeatureKey, string> = { doorWidth: 'Door clear opening', bedHeight: 'Mattress height', stepFree: 'Step-free route', rollInShower: 'Roll-in shower', transferSpace: 'Bed transfer space' }
export const defaultRequirements: Requirements = { doorWidth: 80, bedMin: 45, bedMax: 55, stepFree: true, rollInShower: true, transferSpace: 90 }

export function requirementLabel(key: FeatureKey, r: Requirements) {
  switch (key) {
    case 'doorWidth': return `At least ${r.doorWidth} cm`
    case 'bedHeight': return `${r.bedMin}–${r.bedMax} cm`
    case 'stepFree': return r.stepFree ? 'Entrance to room' : 'Not required'
    case 'rollInShower': return r.rollInShower ? 'Without a raised lip' : 'Not required'
    case 'transferSpace': return `At least ${r.transferSpace} cm`
  }
}
function valueLabel(e: Evidence) { return typeof e.value === 'boolean' ? (e.value ? 'Yes' : 'No') : `${e.value} cm` }
export function evaluate(hotel: Hotel, key: FeatureKey, requirements: Requirements): Finding {
  if ((key === 'stepFree' || key === 'rollInShower') && !requirements[key]) return { state: 'not-required', label: 'Not required', detail: 'You have not selected this requirement for this trip.', sources: [] }
  const relevant = hotel.evidence.filter(e => e.feature === key && e.room === hotel.room && e.quote.trim() &&
    (['stepFree', 'rollInShower'].includes(key) ? typeof e.value === 'boolean' : typeof e.value === 'number' && Number.isFinite(e.value) && e.value > 0 && e.unit === 'cm'))
  // Corrections must name an earlier, different claim. Cycles and self-corrections
  // are retained as conflicts rather than silently erasing the evidence.
  const superseded = new Set(relevant.filter(e => e.source === 'hotel' && e.supersedes && e.supersedes !== e.id &&
    relevant.some(old => old.id === e.supersedes && old.recordedAt <= e.recordedAt && !old.supersedes))
    .map(e => e.supersedes))
  const sources = relevant.filter(e => !superseded.has(e.id))
  if (!sources.length) return { state: 'unknown', label: 'Needs an answer', detail: 'No specific evidence for this room yet.', sources: [] }
  const values = new Set(sources.map(e => e.value))
  if (values.size > 1) return { state: 'conflict', label: 'Answers differ', detail: 'Ask the hotel to clarify before relying on either answer.', sources }
  const value = sources[0].value
  const meets = key === 'doorWidth' ? Number(value) >= requirements.doorWidth :
    key === 'bedHeight' ? Number(value) >= requirements.bedMin && Number(value) <= requirements.bedMax :
    key === 'transferSpace' ? Number(value) >= requirements.transferSpace : !requirements[key] || value === true
  if (!meets) return { state: 'mismatch', label: valueLabel(sources[0]), detail: 'Does not meet your stated requirement.', sources }
  const confirmed = sources.some(e => e.source === 'hotel')
  return { state: confirmed ? 'confirmed' : 'published', label: valueLabel(sources[0]), detail: confirmed ? 'The hotel stated this. It has not been independently inspected.' : 'Listed in hotel material. Direct confirmation is still pending.', sources }
}
export function questionsFor(hotel: Hotel, r: Requirements): string[] {
  const prompts: Record<FeatureKey, string> = {
    doorWidth: `What is the narrowest clear doorway opening on the route into this room and bathroom, measured with the door open? I need at least ${r.doorWidth} cm.`,
    bedHeight: `What is the height from the floor to the top of the mattress? I need ${r.bedMin}–${r.bedMax} cm.`,
    stepFree: 'Is the entire route from the street entrance to this room step-free, including the lift and bathroom?',
    rollInShower: 'Does this room have a roll-in shower with no raised lip or step?',
    transferSpace: `What is the clear space beside the bed for a wheelchair transfer, and on which side? I need at least ${r.transferSpace} cm.`,
  }
  return featureKeys.filter(key => (key !== 'stepFree' && key !== 'rollInShower' || r[key]) && evaluate(hotel, key, r).state !== 'confirmed')
    .map(key => `${evaluate(hotel, key, r).state === 'conflict' ? 'We received conflicting information. Please clarify: ' : ''}${prompts[key]}`)
}
export function inquiryFor(hotel: Hotel, trip: Trip) {
  return `Hello ${hotel.name} team,\n\nI am considering the ${hotel.room} for ${trip.arrival} to ${trip.departure}. Before booking, could you please confirm the following for this specific room type?\n\n${questionsFor(hotel, trip.requirements).map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nPlease also confirm whether a room with these exact features is available for those dates and how it can be reserved. Please say if a measurement is unknown rather than estimating it.\n\nThank you.`
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validateTrip(trip: Trip): string | null {
  if (!trip.title.trim() || !trip.destination.trim()) return 'Add a trip name and destination.'
  if (!validDate(trip.arrival) || !validDate(trip.departure) || trip.departure <= trip.arrival) return 'Choose valid dates with departure after arrival.'
  const r = trip.requirements
  if (![r.doorWidth, r.bedMin, r.bedMax, r.transferSpace].every(n => Number.isFinite(n) && n >= 1 && n <= 300) || r.bedMin > r.bedMax) return 'Check your measurements and mattress height range (1–300 cm).'
  if (trip.hotels.length < 1 || trip.hotels.length > 3) return 'Add between one and three hotels.'
  for (const h of trip.hotels) {
    if (!h.name.trim() || !h.room.trim()) return 'Each hotel needs a name and a specific room type.'
    if (!isPublicHotelUrl(h.url)) return 'Use a public HTTPS hotel website.'
  }
  return null
}
export function createBrief(trip: Trip): string {
  return [`# ${trip.title}`, `${trip.destination} · ${trip.arrival} to ${trip.departure}`, '', 'Hotel statements and published information, not an independent accessibility inspection.', '', ...trip.hotels.flatMap(h => [
    `## ${h.name} — ${h.room}`, h.url, ...(h.inventory ? [`Property metadata: LiteAPI sandbox; ID ${h.inventory.providerId}; retrieved ${new Date(h.inventory.fetchedAt).toISOString()}.`, `Address: ${h.inventory.address}, ${h.inventory.city}, ${h.inventory.country}. Provider content is not accessibility evidence.`] : []), `Availability: ${h.availability}${h.availabilityNote ? ` — ${h.availabilityNote}` : ''}`, '',
    ...featureKeys.flatMap(k => { const f = evaluate(h, k, trip.requirements); return [`### ${featureLabels[k]} — ${requirementLabel(k, trip.requirements)}`, `${f.label} (${f.state}). ${f.detail}`, ...f.sources.map(e => `> ${e.quote}\nSource: ${e.sourceLabel}; ${e.recordedAt}; ${e.url ?? 'hotel email'}; room: ${e.room}`), ''] }),
  ])].join('\n')
}
