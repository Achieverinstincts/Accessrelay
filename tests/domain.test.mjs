import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultRequirements, evaluate, inquiryFor, validateTrip, createBrief } from '../src/domain.ts'

const hotel = () => ({ id: 'h1', name: 'Test hotel', room: 'Accessible queen', url: 'https://www.hyatt.com', location: 'London', email: '', evidence: [], availability: 'unknown' })
const claim = (changes = {}) => ({ id: 'e1', feature: 'doorWidth', value: 84, unit: 'cm', quote: 'The narrowest opening is 84 cm.', source: 'published', sourceLabel: 'Room guide', room: 'Accessible queen', recordedAt: '2026-09-08', ...changes })
const trip = () => ({ title: 'Test trip', destination: 'London', arrival: '2026-10-12', departure: '2026-10-15', requirements: { ...defaultRequirements }, hotels: [hotel()] })
test('no source means unknown, not an accessibility pass', () => assert.equal(evaluate(hotel(), 'doorWidth', defaultRequirements).state, 'unknown'))
test('a published measurement is not a hotel confirmation', () => assert.equal(evaluate({ ...hotel(), evidence: [claim()] }, 'doorWidth', defaultRequirements).state, 'published'))
test('hotel confirmation matching requirement is identified', () => assert.equal(evaluate({ ...hotel(), evidence: [claim({ source: 'hotel' })] }, 'doorWidth', defaultRequirements).state, 'confirmed'))
test('evidence from another room is excluded', () => assert.equal(evaluate({ ...hotel(), evidence: [claim({ room: 'Standard queen' })] }, 'doorWidth', defaultRequirements).state, 'unknown'))
test('different measurements conflict even if both pass requirement', () => assert.equal(evaluate({ ...hotel(), evidence: [claim(), claim({ id: 'e2', value: 86, source: 'hotel' })] }, 'doorWidth', defaultRequirements).state, 'conflict'))
test('newer reply alone does not silently overwrite a conflict', () => assert.equal(evaluate({ ...hotel(), evidence: [claim(), claim({ id: 'e2', value: 76, source: 'hotel', recordedAt: '2026-09-09' })] }, 'doorWidth', defaultRequirements).state, 'conflict'))
test('an explicit hotel correction resolves the superseded claim', () => assert.equal(evaluate({ ...hotel(), evidence: [claim(), claim({ id: 'e2', value: 76, source: 'hotel', supersedes: 'e1' })] }, 'doorWidth', defaultRequirements).state, 'mismatch'))
test('updated requirements immediately invalidate former match', () => assert.equal(evaluate({ ...hotel(), evidence: [claim({ source: 'hotel' })] }, 'doorWidth', { ...defaultRequirements, doorWidth: 90 }).state, 'mismatch'))
test('unquoted and unspecified-unit measurements cannot create a match', () => {
  for (const e of [claim({ quote: '' }), claim({ unit: undefined }), claim({ value: Number.NaN }), claim({ value: true })]) assert.equal(evaluate({ ...hotel(), evidence: [e] }, 'doorWidth', defaultRequirements).state, 'unknown')
})
test('bed height must fall within the inclusive range', () => {
  for (const [value, state] of [[44, 'mismatch'], [45, 'published'], [55, 'published'], [56, 'mismatch']]) assert.equal(evaluate({ ...hotel(), evidence: [claim({ feature: 'bedHeight', value })] }, 'bedHeight', defaultRequirements).state, state)
})
test('matching physical features never imply availability', () => { const t = trip(); t.hotels[0].evidence = [claim({ source: 'hotel' })]; evaluate(t.hotels[0], 'doorWidth', t.requirements); assert.equal(t.hotels[0].availability, 'unknown'); assert.match(createBrief(t), /Availability: unknown/) })
test('inquiry omits confirmed questions but asks for date-specific availability', () => { const t = trip(); t.hotels[0].evidence = [claim({ source: 'hotel' })]; const draft = inquiryFor(t.hotels[0], t); assert.doesNotMatch(draft, /narrowest clear doorway/); assert.match(draft, /2026-10-12 to 2026-10-15/); assert.match(draft, /available for those dates/); assert.match(draft, /mattress/) })
test('conflicting replies trigger an explicit clarification question', () => { const t = trip(); t.hotels[0].evidence = [claim(), claim({ id: 'e2', value: 70 })]; assert.match(inquiryFor(t.hotels[0], t), /conflicting information/) })
test('invalid trip dates, impossible ranges and nonpublic URLs fail validation', () => {
  assert.equal(validateTrip(trip()), null)
  const date = trip(); date.departure = date.arrival; assert.match(validateTrip(date), /departure/)
  const range = trip(); range.requirements.bedMin = 70; assert.match(validateTrip(range), /measurements/)
  for (const url of ['http://hotel.example', 'https://127.0.0.1', 'https://localhost', 'https://10.0.0.1', 'https://user:pass@hotel.example', 'not-a-url']) { const t = trip(); t.hotels[0].url = url; assert.notEqual(validateTrip(t), null) }
})
test('export includes quotes, room scope, source date and uncertainty', () => { const t = trip(); t.hotels[0].evidence = [claim()]; const brief = createBrief(t); for (const text of ['84 cm', 'Accessible queen', '2026-09-08', 'Room guide', 'unknown', 'not an independent']) assert.ok(brief.includes(text), text) })
test('impossible calendar dates are rejected', () => {
  for (const arrival of ['2026-02-30', '2026-13-01', '2026-00-10']) { const t = trip(); t.arrival = arrival; assert.notEqual(validateTrip(t), null) }
})
test('reserved domains, IP encodings and nonstandard ports are rejected', () => {
  for (const url of ['https://172.16.0.1', 'https://2130706433', 'https://0x7f000001', 'https://[::1]', 'https://hotel.local', 'https://hotel.internal', 'https://hotel.example', 'https://www.hyatt.com:8443']) { const t = trip(); t.hotels[0].url = url; assert.notEqual(validateTrip(t), null, url) }
})
test('self-corrections and cycles cannot erase conflicting evidence', () => {
  const first = claim({ source: 'hotel', supersedes: 'e2' }), second = claim({ id: 'e2', value: 70, source: 'hotel', supersedes: 'e1' })
  assert.equal(evaluate({ ...hotel(), evidence: [first, second] }, 'doorWidth', defaultRequirements).state, 'conflict')
  assert.equal(evaluate({ ...hotel(), evidence: [claim({ source: 'hotel', supersedes: 'e1' })] }, 'doorWidth', defaultRequirements).state, 'confirmed')
})
test('deselected requirements do not create missing-answer tasks', () => {
  const t = trip(); t.requirements.stepFree = false; t.requirements.rollInShower = false
  assert.equal(evaluate(t.hotels[0], 'stepFree', t.requirements).state, 'not-required')
  assert.equal(evaluate(t.hotels[0], 'rollInShower', t.requirements).state, 'not-required')
  assert.doesNotMatch(inquiryFor(t.hotels[0], t), /step-free|roll-in shower/)
})
