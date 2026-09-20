import { useState } from 'react'
import './inventory.css'
import { useAction } from 'convex/react'
import { api } from '../convex/_generated/api'
import type { InventoryHotel } from './inventory'
import { defaultRequirements, validateTrip, type Trip } from './domain'

type Selection = { name: string; url: string; room: string; inventory?: InventoryHotel }
export function HotelDiscovery({ save, busy }: { save: (trip: Trip) => Promise<void>; busy: boolean }) {
  const search = useAction(api.inventory.search), details = useAction(api.inventory.details)
  const [city, setCity] = useState('London'), [country, setCountry] = useState('GB'), [name, setName] = useState('')
  const [results, setResults] = useState<InventoryHotel[]>([]), [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(''), [error, setError] = useState('')
  const [hotels, setHotels] = useState<Selection[]>([])
  const [title, setTitle] = useState(''), [arrival, setArrival] = useState(''), [departure, setDeparture] = useState('')
  async function find() {
    setLoading('search'); setError(''); setResults([]); setSearched(false)
    try { setResults(await search({ city, country, name })); setSearched(true) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Hotel discovery could not finish.') }
    finally { setLoading('') }
  }
  async function select(hotel: InventoryHotel) {
    if (hotels.length >= 3) return
    setLoading(hotel.providerId); setError('')
    try { const inventory = await details({ providerId: hotel.providerId }); setHotels(previous => previous.length >= 3 || previous.some(item => item.inventory?.providerId === inventory.providerId) ? previous : [...previous, { name: inventory.name, url: '', room: '', inventory }]) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Hotel details could not load.') }
    finally { setLoading('') }
  }
  function update(index: number, values: Partial<Selection>) { setHotels(hotels.map((hotel, i) => i === index ? { ...hotel, ...values } : hotel)) }
  return <form onSubmit={async event => {
    event.preventDefault()
    const trip: Trip = { title, destination: `${city.trim()}, ${country.trim().toUpperCase()}`, arrival, departure, requirements: { ...defaultRequirements }, hotels: hotels.map((hotel, index) => ({ ...hotel, id: `hotel-${index}`, location: hotel.inventory?.address ?? city, email: '', evidence: [], availability: 'unknown' })) }
    const issue = validateTrip(trip)
    if (issue) { setError(issue); return }
    setError('')
    try { await save(trip) } catch (reason) { setError(reason instanceof Error ? reason.message : 'The comparison could not be saved. Your shortlist is still here.') }
  }}>
    <p className="inventory-disclosure">Real property content · LiteAPI sandbox. Photos and room names help identify a hotel; accessibility and availability still need evidence.</p>
    <div className="discovery-search"><label>City<input value={city} onChange={event => { setCity(event.target.value); setResults([]); setSearched(false) }} maxLength={100}/></label><label>Country code<input value={country} onChange={event => { setCountry(event.target.value.toUpperCase()); setResults([]); setSearched(false) }} maxLength={2} placeholder="GB"/></label><label>Hotel name (optional)<input value={name} onChange={event => setName(event.target.value)} placeholder="Narrow your search" maxLength={100}/></label><button className="primary" type="button" disabled={!!loading || !city.trim() || country.length !== 2} onClick={find}>{loading === 'search' ? 'Finding hotels…' : 'Find real hotels'}</button></div>
    {searched && !results.length && <p role="status">No properties returned for this search. Try another city spelling or add an official hotel page below.</p>}
    <div className="inventory-results" aria-busy={!!loading}>{results.map(hotel => <article className="inventory-result" key={hotel.providerId}>{hotel.photo && <img src={hotel.photo} alt={`${hotel.name} — provider photograph`} loading="lazy" referrerPolicy="no-referrer"/>}<div><h3>{hotel.name}</h3><p>{hotel.address} · {hotel.city}, {hotel.country}</p><small>{hotel.stars ? `${hotel.stars}-star property · ` : ''}LiteAPI content</small><button type="button" className="secondary" disabled={!!loading || hotels.length >= 3 || hotels.some(item => item.inventory?.providerId === hotel.providerId)} onClick={() => select(hotel)}>{loading === hotel.providerId ? 'Loading rooms…' : hotels.some(item => item.inventory?.providerId === hotel.providerId) ? 'Added to shortlist' : 'Choose this hotel'}</button></div></article>)}</div>
    {results.length === 12 && <p className="form-note">Showing the first 12 properties, not a complete city inventory. Add a hotel name to narrow the search.</p>}
    <h3>Your shortlist · {hotels.length}/3</h3>
    {hotels.map((hotel, index) => <fieldset key={hotel.inventory?.providerId ?? index}><legend>{hotel.name || `Hotel ${index + 1}`}</legend>{!hotel.inventory && <label>Hotel name<input required value={hotel.name} onChange={event => update(index, { name: event.target.value })}/></label>}
      <label>Official hotel or room page<input required type="url" value={hotel.url} placeholder="https://…" onChange={event => update(index, { url: event.target.value })}/></label><p className="form-note">The provider does not reliably supply official websites. Use the property’s own page; we will research that source.</p>
      <label>Specific room type<input required list={`rooms-${index}`} value={hotel.room} onChange={event => update(index, { room: event.target.value })} placeholder="Choose a listed room or enter its exact name"/><datalist id={`rooms-${index}`}>{hotel.inventory?.rooms.map(room => <option value={room} key={room}/>)}</datalist></label>
      {hotel.inventory && <p className="form-note">{hotel.inventory.rooms.length} provider room names available. Room names may differ from the official site; no accessible room is assumed.</p>}
      <button className="text-button" type="button" onClick={() => setHotels(hotels.filter((_, i) => i !== index))}>Remove hotel</button>
    </fieldset>)}
    {hotels.length < 3 && <button type="button" className="text-button" onClick={() => setHotels([...hotels, { name: '', url: '', room: '' }])}>Add an official hotel page manually</button>}
    <div className="form-grid"><label>Trip name<input required value={title} onChange={event => setTitle(event.target.value)} placeholder="My next trip" maxLength={100}/></label><label>Arrival<input required type="date" value={arrival} onChange={event => setArrival(event.target.value)}/></label><label>Departure<input required type="date" min={arrival} value={departure} onChange={event => setDeparture(event.target.value)}/></label></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="dialog-footer"><button className="primary" type="submit" disabled={busy || !!loading || !hotels.length}>{busy ? 'Saving comparison…' : 'Create evidence comparison'}</button></div>
  </form>
}
