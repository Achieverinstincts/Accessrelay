import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalEmail, sameMailbox } from '../src/emailIdentity.ts'

test('normalizes plain and display-name mailbox forms', () => {
  assert.equal(canonicalEmail(' Reservations <BOOKING@Hotel.Example> '), 'booking@hotel.example')
  assert.equal(canonicalEmail('BOOKING@Hotel.Example'), 'booking@hotel.example')
})

test('accepts only the exact address the traveler approved', () => {
  assert.equal(sameMailbox('Reservations <booking@hotel.example>', 'booking@hotel.example'), true)
  assert.equal(sameMailbox('other@hotel.example', 'booking@hotel.example'), false)
  assert.equal(sameMailbox('booking@lookalike.example', 'booking@hotel.example'), false)
})

test('rejects malformed mailbox strings', () => {
  assert.equal(canonicalEmail('Hotel reservations'), null)
  assert.equal(sameMailbox('', 'booking@hotel.example'), false)
})
