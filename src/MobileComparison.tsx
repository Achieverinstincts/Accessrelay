import { Check, CircleHelp, FileText, LoaderCircle, Mail, RefreshCw } from 'lucide-react'
import { evaluate, featureKeys, featureLabels, requirementLabel, type FeatureKey, type Hotel, type Trip } from './domain'
import { HotelPhoto } from './HotelPhoto'

type ResearchRow = { hotelId: string; state: 'idle' | 'queued' | 'running' | 'complete' | 'failed'; error: string | null }
export function MobileComparison({ trip, research, busy, onResearch, onSource, onInquiry }: {
  trip: Trip; research?: ResearchRow[]; busy: string;
  onResearch: (hotel: Hotel) => void; onSource: (hotel: Hotel, feature: FeatureKey) => void; onInquiry: (hotel: Hotel) => void;
}) {
  return <section className="mobile-hotel-list" tabIndex={0} role="region" aria-label="Mobile hotel comparison">
    {trip.hotels.map(hotel => {
      const job = research?.find(item => item.hotelId === hotel.id)
      return <article className="mobile-hotel-card" key={hotel.id}>
        <HotelPhoto hotel={hotel}/><h3>{hotel.name}</h3><p className="mobile-location">{hotel.location}</p><span className="room-label">{hotel.room}</span>
        <button className="research-button" disabled={job?.state === 'queued' || job?.state === 'running' || busy === `research-${hotel.id}`} onClick={() => onResearch(hotel)}>{job?.state === 'queued' || job?.state === 'running' ? <><LoaderCircle size={14} className="spin"/> Researching…</> : <><RefreshCw size={14}/> {job?.state === 'complete' ? 'Refresh official source' : 'Research official source'}</>}</button>
        {job?.error && <small className="research-error">{job.error}</small>}
        <div className="mobile-findings">{featureKeys.map(key => { const finding = evaluate(hotel, key, trip.requirements); return <button key={key} className={`mobile-finding finding-${finding.state}`} onClick={() => onSource(hotel, key)}><span><strong>{featureLabels[key]}</strong><small>{requirementLabel(key, trip.requirements)}</small></span><span className="finding-value">{finding.state === 'confirmed' ? <Check size={15}/> : finding.state === 'unknown' ? <CircleHelp size={15}/> : finding.state === 'conflict' || finding.state === 'mismatch' ? <span className="alert-symbol">!</span> : <FileText size={14}/>} {finding.label}</span></button> })}</div>
        <div className="mobile-availability"><span><strong>Room availability</strong><small>For your travel dates</small></span><span><strong>{hotel.availability === 'confirmed' ? 'Hotel says available' : hotel.availability === 'unavailable' ? 'Unavailable' : 'Not confirmed'}</strong><small>{hotel.availabilityNote ?? 'Separate from room features'}</small></span></div>
        <button className="secondary full" onClick={() => onInquiry(hotel)}><Mail size={15}/> Review hotel questions</button>
      </article>
    })}
  </section>
}
