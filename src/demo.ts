import { defaultRequirements, type Evidence, type FeatureKey, type Hotel, type Trip } from './domain'
const date = '2026-09-08'
function evidence(h: string, feature: FeatureKey, value: number | boolean, quote: string, source: 'published' | 'hotel' = 'published'): Evidence {
  return { id: `${h}-${feature}-${source}`, feature, value, quote, source, sourceLabel: source === 'hotel' ? 'Example reply from reservations' : 'Example hotel accessibility guide', room: 'Accessible king room', recordedAt: date, ...(typeof value === 'number' ? { unit: 'cm' as const } : {}) }
}
const hotels: Hotel[] = [
  { id: 'canal', name: 'Canal House', location: 'Paddington · London', url: 'https://canal-house.example', room: 'Accessible king room', email: 'reservations@canal-house.example', availability: 'unknown', evidence: [
    evidence('canal', 'doorWidth', 84, 'The accessible king bedroom door has a clear opening of 84 cm.'),
    evidence('canal', 'stepFree', true, 'A step-free route connects the street entrance, lift, accessible king room and bathroom.'),
    evidence('canal', 'rollInShower', true, 'The accessible king bathroom includes a level-entry shower with no raised lip.'),
  ] },
  { id: 'park', name: 'Park & Field', location: 'Bloomsbury · London', url: 'https://park-and-field.example', room: 'Accessible king room', email: 'stay@park-and-field.example', availability: 'unknown', evidence: [
    evidence('park', 'doorWidth', 78, 'The clear opening into our accessible king bathroom measures 78 cm.', 'hotel'),
    evidence('park', 'bedHeight', 51, 'Floor to top of mattress in the accessible king room: 51 cm.'),
    evidence('park', 'stepFree', true, 'The entrance-to-room route and bathroom are step-free for the accessible king room.'),
    evidence('park', 'rollInShower', true, 'Our accessible king room has a roll-in shower with no threshold.'),
    evidence('park', 'transferSpace', 95, 'The accessible king room has 95 cm clear space to the right of the bed.'),
  ] },
  { id: 'north', name: 'The Northbank', location: 'South Bank · London', url: 'https://northbank.example', room: 'Accessible king room', email: 'rooms@northbank.example', availability: 'unknown', evidence: [
    evidence('north', 'doorWidth', 86, 'Accessible king room: narrowest doorway clear opening 86 cm.'),
    evidence('north', 'bedHeight', 52, 'Accessible king room mattress height: 52 cm.'),
    evidence('north', 'bedHeight', 62, 'I measured the accessible king bed today: it is 62 cm from floor to top of mattress.', 'hotel'),
    evidence('north', 'stepFree', true, 'The accessible king room has a step-free route from the street, including the bathroom.'),
  ] },
]
export function demoTrip(): Trip { return structuredClone({ title: 'A few days in London', destination: 'London, United Kingdom', arrival: '2026-10-12', departure: '2026-10-15', requirements: defaultRequirements, hotels }) }
export function applyDemoReply(trip: Trip): Trip {
  return { ...trip, hotels: trip.hotels.map(h => h.id !== 'canal' ? h : { ...h, availability: 'confirmed', availabilityNote: 'Example hotel reply: available on 12–15 October; not held or booked.', evidence: [
    ...h.evidence.filter(e => e.source !== 'hotel'),
    evidence('canal', 'doorWidth', 84, 'For the accessible king room, the narrowest clear opening (including bathroom) is 84 cm.', 'hotel'),
    evidence('canal', 'bedHeight', 50, 'The mattress top is 50 cm from the floor.', 'hotel'),
    evidence('canal', 'stepFree', true, 'The full route from street entrance to the accessible king room and bathroom is step-free.', 'hotel'),
    evidence('canal', 'rollInShower', true, 'The shower is level-entry with no raised lip.', 'hotel'),
    evidence('canal', 'transferSpace', 100, 'There is 100 cm of clear space on the left side of the bed.', 'hotel'),
  ] } ) }
}
