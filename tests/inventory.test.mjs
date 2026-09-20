import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHotel, readInventoryResponse } from '../src/inventory.ts'
test('provider accessibility defaults never become room evidence', () => {
  const hotel = normalizeHotel({ id: 'lp19e0b', name: 'Royal Lancaster London', accessibilityAttributes: { entranceDoorWidth: 0, showerChair: true }, rooms: [{ roomName: 'Deluxe' }, { roomName: 'Deluxe' }], main_photo: 'https://static.cupid.travel/hotels/130774650.jpg' }, 10)
  assert.equal(hotel.environment, 'sandbox'); assert.deepEqual(hotel.rooms, ['Deluxe'])
  assert.equal('evidence' in hotel, false); assert.equal('accessibilityAttributes' in hotel, false); assert.equal('availability' in hotel, false)
})
test('deleted or invalid properties and unsafe image URLs are not trusted', () => {
  assert.equal(normalizeHotel({ id: 'bad/id', name: 'X' }, 1), null)
  assert.equal(normalizeHotel({ id: 'x', name: 'X', deletedAt: '2026-01-01' }, 1), null)
  assert.equal(normalizeHotel({ id: 'x', name: 'X', main_photo: 'https://attacker.example/image' }, 1).photo, '')
  assert.equal(normalizeHotel({ id: 'x', name: 'X', latitude: 200 }, 1).latitude, null)
})
test('provider failures, malformed and oversized content fail closed', async () => {
  await assert.rejects(readInventoryResponse(new Response('{}', { status: 429 })), /429/)
  await assert.rejects(readInventoryResponse(new Response('not json')))
  await assert.rejects(readInventoryResponse(new Response('x'.repeat(2_000_001))), /limit/)
})
