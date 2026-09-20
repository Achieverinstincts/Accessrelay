/** Provider content is discovery metadata, never accessibility evidence. */
export type InventoryHotel = {
  provider: 'liteapi'; environment: 'sandbox'; providerId: string;
  name: string; address: string; city: string; country: string;
  latitude: number | null; longitude: number | null; photo: string;
  stars: number | null; rooms: string[]; fetchedAt: number;
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const text = (value: unknown, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function coordinate(value: unknown, max: number) { return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max ? value : null }
function photo(value: unknown) {
  try { const url = new URL(text(value, 2000)); return url.protocol === 'https:' && url.hostname === 'static.cupid.travel' && !url.username && !url.password ? url.href : '' } catch { return '' }
}
export function normalizeHotel(input: unknown, fetchedAt: number): InventoryHotel | null {
  const item = object(input), location = object(item.location)
  const providerId = text(item.id, 100), name = text(item.name)
  if (!/^[a-zA-Z0-9_-]+$/.test(providerId) || !name || item.deletedAt) return null
  const rooms = Array.isArray(item.rooms) ? [...new Set(item.rooms.map(room => text(object(room).roomName)).filter(Boolean))].slice(0, 60) : []
  const stars = item.starRating ?? item.stars
  return { provider: 'liteapi', environment: 'sandbox', providerId, name,
    address: text(item.address), city: text(item.city), country: text(item.country, 2).toUpperCase(),
    latitude: coordinate(item.latitude ?? location.latitude, 90), longitude: coordinate(item.longitude ?? location.longitude, 180),
    photo: photo(item.main_photo ?? item.thumbnail), stars: typeof stars === 'number' && stars >= 0 && stars <= 5 ? stars : null,
    rooms, fetchedAt }
}
export async function readInventoryResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Hotel provider returned HTTP ${response.status}.`)
  if (!response.body) throw new Error('Hotel provider returned no content.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 2_000_000) throw new Error('Hotel response exceeded the preview limit.'); chunks.push(part.value) } }
  finally { await reader.cancel() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}
