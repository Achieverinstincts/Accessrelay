import { useState } from 'react'
import type { Hotel } from './domain'
export function HotelPhoto({ hotel }: { hotel: Hotel }) {
  const [failed, setFailed] = useState(false)
  return <figure className="hotel-photo">{hotel.inventory?.photo && !failed ? <img src={hotel.inventory.photo} alt={`${hotel.name} — property photograph`} referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <div className="photo-unavailable">Property photo unavailable</div>}<figcaption>{hotel.inventory ? 'LiteAPI · sandbox property content' : 'Manually added property'}<span>Photos are not accessibility evidence.</span></figcaption></figure>
}
