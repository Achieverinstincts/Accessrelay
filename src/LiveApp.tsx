import { HotelPhoto } from './HotelPhoto'
import { HotelDiscovery } from './HotelDiscovery'
import { MobileComparison } from './MobileComparison'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, CircleHelp, ExternalLink, FileText, LoaderCircle, LogOut, Mail, MapPin, Plus, RefreshCw, Route, Settings2, ShieldCheck, X } from 'lucide-react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { createBrief, evaluate, featureKeys, featureLabels, inquiryFor, requirementLabel, type FeatureKey, type Hotel, type Requirements, type Trip } from './domain'

type Panel = { type: 'requirements' } | { type: 'source'; hotel: Hotel; feature: FeatureKey } | { type: 'inquiry'; hotel: Hotel } | { type: 'new' } | null
type InquiryRow = {
  id: Id<'inquiries'>
  hotelId: string
  recipient: string
  subject: string
  body: string
  tripRevision: number
  state: 'draft' | 'approved' | 'sending' | 'sent' | 'uncertain' | 'failed'
  providerThreadId: string | null
  error: string | null
  updatedAt: number
}

function Modal({ title, description, children, close }: { title: string; description: string; children: ReactNode; close: () => void }) {
  return <Dialog.Root open onOpenChange={open => !open && close()}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog"><div className="dialog-head"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Close"><X size={20}/></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>
}

function RequirementsForm({ initial, save, busy }: { initial: Requirements; save: (requirements: Requirements) => void; busy: boolean }) {
  const [requirements, setRequirements] = useState(initial)
  const [error, setError] = useState('')
  return <form onSubmit={event => { event.preventDefault(); if (requirements.bedMin > requirements.bedMax) return setError('Minimum mattress height must not exceed maximum.'); save(requirements) }}>
    <p className="form-note">Use your own measurements. AccessRelay compares hotel statements; it does not decide what is suitable for you.</p>
    <div className="form-grid">{([{ key: 'doorWidth', label: 'Minimum door opening' }, { key: 'transferSpace', label: 'Minimum bed transfer space' }, { key: 'bedMin', label: 'Minimum mattress height' }, { key: 'bedMax', label: 'Maximum mattress height' }] as const).map(({ key, label }) => <label key={key}>{label}<div className="unit-input"><input required type="number" min="1" max="300" value={requirements[key]} onChange={event => setRequirements({ ...requirements, [key]: event.target.valueAsNumber })}/><span>cm</span></div></label>)}</div>
    <label className="check-label"><input type="checkbox" checked={requirements.stepFree} onChange={event => setRequirements({ ...requirements, stepFree: event.target.checked })}/> Step-free route from street entrance to room and bathroom</label>
    <label className="check-label"><input type="checkbox" checked={requirements.rollInShower} onChange={event => setRequirements({ ...requirements, rollInShower: event.target.checked })}/> Roll-in shower without a raised lip</label>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="dialog-footer"><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save requirements'} <Check size={17}/></button></div>
  </form>
}

function InquiryEditor({ hotel, trip, revision, latest, attempts, close, saveDraft, approve }: { hotel: Hotel; trip: Trip; revision: number; latest?: InquiryRow; attempts: number; close: () => void; saveDraft: (input: { recipient: string; subject: string; body: string; revision: number }) => Promise<Id<'inquiries'>>; approve: (id: Id<'inquiries'>) => Promise<void> }) {
  const [recipient, setRecipient] = useState(latest?.recipient ?? hotel.email)
  const [subject, setSubject] = useState(latest?.subject ?? `Accessibility details for ${hotel.room}, ${trip.arrival}–${trip.departure}`)
  const [body, setBody] = useState(latest?.state === 'draft' ? latest.body : inquiryFor(hotel, trip))
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = Boolean(latest && ['approved', 'sending', 'uncertain'].includes(latest.state)) || attempts >= 2
  return <Modal title="Ask for the missing details" description="Review the address and every word before approving one send attempt." close={close}>
    {latest && <div className={`inquiry-state state-${latest.state}`}><strong>{attempts >= 2 ? 'Initial inquiry and one follow-up already sent' : latest.state === 'sent' ? 'Sent — one reviewed follow-up is available if needed' : latest.state === 'uncertain' ? 'Delivery uncertain — do not retry yet' : latest.state === 'sending' || latest.state === 'approved' ? 'Sending one approved message' : latest.state === 'failed' ? 'Nothing was sent' : 'Draft saved'}</strong>{latest.error && <p>{latest.error}</p>}</div>}
    <label>Hotel email<input type="email" required value={recipient} disabled={locked} onChange={event => setRecipient(event.target.value)} placeholder="reservations@hotel.example"/></label>
    <label>Subject<input required value={subject} disabled={locked} onChange={event => setSubject(event.target.value)} maxLength={180}/></label>
    <label className="email-body-label">Message<textarea className="email-body" value={body} disabled={locked} onChange={event => setBody(event.target.value)} maxLength={12000}/></label>
    {!locked && <label className="check-label approval-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)}/> I reviewed the recipient and message. Send this one email now.</label>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="dialog-footer"><button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(body) } catch { setError('Clipboard access failed. Select and copy the message text.') } }}>Copy draft</button>{!locked && <button className="primary" disabled={!reviewed || busy} onClick={async () => {
      setBusy(true); setError('')
      try { const id = await saveDraft({ recipient, subject, body, revision }); await approve(id); close() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not approve this message.') } finally { setBusy(false) }
    }}>{busy ? 'Approving…' : latest?.state === 'sent' ? 'Approve one follow-up' : 'Approve and send once'} <Mail size={16}/></button>}</div>
  </Modal>
}

export default function LiveApp({ showDemo }: { showDemo: () => void }) {
  const { signOut } = useAuthActions()
  const trips = useQuery(api.trips.list)
  const [selectedId, setSelectedId] = useState<Id<'trips'> | null>(null)
  useEffect(() => { if (!selectedId && trips?.[0]) setSelectedId(trips[0].id) }, [selectedId, trips])
  const row = useQuery(api.trips.get, selectedId ? { id: selectedId } : 'skip')
  const research = useQuery(api.research.status, selectedId ? { tripId: selectedId } : 'skip')
  const inquiries = useQuery(api.inquiries.list, selectedId ? { tripId: selectedId } : 'skip')
  const events = useQuery(api.events.list, selectedId ? { tripId: selectedId } : 'skip')
  const createTrip = useMutation(api.trips.create)
  const updateRequirements = useMutation(api.trips.updateRequirements)
  const requestResearch = useMutation(api.research.request)
  const saveInquiry = useMutation(api.inquiries.saveDraft)
  const approveInquiry = useMutation(api.inquiries.approveAndSend)
  const [panel, setPanel] = useState<Panel>(null)
  const [tab, setTab] = useState<'comparison' | 'activity'>('comparison')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const trip = row?.data as Trip | undefined
  const revision = row?.revision ?? 0
  const findings = useMemo(() => trip ? trip.hotels.flatMap(hotel => featureKeys.map(key => evaluate(hotel, key, trip.requirements))) : [], [trip])
  const unresolved = findings.filter(finding => finding.state === 'unknown' || finding.state === 'conflict' || finding.state === 'mismatch').length

  const perform = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key); setNotice('')
    try { await action(); setNotice(success) } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'That action could not be completed.') } finally { setBusy('') }
  }

  if (trips === undefined) return <div className="loading-page"><LoaderCircle className="spin"/> Opening your workspace…</div>
  return <div className="app-shell live-shell">
    <aside className="sidebar"><button className="brand brand-button" onClick={showDemo} aria-label="Open AccessRelay example"><span className="brand-icon"><Route size={23}/></span>accessrelay<span className="brand-period">.</span></button><div className="workspace-label">YOUR PRIVATE WORKSPACE</div><nav aria-label="Saved trips">{trips.map(item => <button key={item.id} className={`nav-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => { setSelectedId(item.id); setTab('comparison') }}><MapPin size={18}/><span className="nav-trip-copy">{item.title}<small>{item.destination}</small></span></button>)}</nav><button className="secondary sidebar-create" onClick={() => setPanel({ type: 'new' })}><Plus size={16}/> New trip</button><div className="sidebar-bottom"><button className="connection-button" onClick={() => signOut()}><LogOut size={16}/> Sign out <ChevronRight size={16}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">Live workspace <ChevronRight size={14}/><span>{trip?.destination ?? 'New trip'}</span></div><button className="text-button" onClick={showDemo}>View fictional example</button></header><main id="main">
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
      {!trip || !selectedId ? <section className="empty-workspace"><span className="brand-icon"><Route size={26}/></span><p className="eyebrow">START WITH YOUR SHORTLIST</p><h1>Compare the rooms you are actually considering.</h1><p>Find real hotels, choose a room, and check the details that matter. Published evidence, hotel answers, and unknowns stay separate.</p><button className="primary" onClick={() => setPanel({ type: 'new' })}><Plus size={17}/> Create your first trip</button></section> : <>
        <div className="live-banner"><span className="status-dot"/><strong>Saved and reactive</strong><span>Research and replies update this comparison as they arrive.</span></div>
        <div className="page-title"><div><p className="eyebrow">MORE CONFIDENCE, BEFORE YOU BOOK</p><h1>{trip.title}</h1><p className="trip-meta"><MapPin size={15}/>{trip.destination}<span>·</span>{new Date(`${trip.arrival}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(`${trip.departure}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}<span>·</span>{trip.hotels.length} hotels</p></div><button className="secondary" onClick={() => { const blob = new Blob([createBrief(trip)], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-accessibility-brief.md`; anchor.click(); URL.revokeObjectURL(url) }}><ArrowDownToLine size={17}/> Export brief</button></div>
        <section className="requirements-strip"><div className="requirements-intro"><span className="small-icon"><Settings2 size={18}/></span><div><strong>Your essentials</strong><small>Every hotel, the same questions.</small></div></div><div className="requirement-chips"><span>Door ≥ {trip.requirements.doorWidth} cm</span><span>Bed {trip.requirements.bedMin}–{trip.requirements.bedMax} cm</span>{trip.requirements.stepFree && <span>Step-free</span>}{trip.requirements.rollInShower && <span>Roll-in shower</span>}<span>Transfer ≥ {trip.requirements.transferSpace} cm</span></div><button className="text-button" onClick={() => setPanel({ type: 'requirements' })}>Edit <ArrowRight size={14}/></button></section>
        <section className="progress-card"><div className="progress-symbol"><ShieldCheck size={26}/></div><div><p className="eyebrow">SOURCE-BOUND ANSWERS</p><h2>{unresolved ? `${unresolved} details still need a specific answer.` : 'Every selected requirement has evidence.'}</h2><p>Research reads each official page. Hotel email remains under your control and requires a separate approval.</p></div></section>
        <div className="section-toolbar"><div role="tablist" className="tabs"><button role="tab" aria-selected={tab === 'comparison'} onClick={() => setTab('comparison')}>Compare hotels <span>{trip.hotels.length}</span></button><button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Activity <span>{events?.length ?? 0}</span></button></div><span className="quiet-count">Revision {revision}</span></div>
        {tab === 'comparison' ? <><div className="table-scroll" tabIndex={0} role="region" aria-label="Hotel comparison, scroll horizontally to compare all hotels"><table className="comparison-table"><caption className="sr-only">Hotel evidence compared with your accessibility requirements</caption><thead><tr><th className="criteria-heading"><span>THE DETAILS THAT MATTER</span><h3>Your requirements.<br/>Their answers.</h3><p>Select an answer to inspect its source.</p></th>{trip.hotels.map((hotel) => { const job = research?.find(item => item.hotelId === hotel.id); return <th key={hotel.id}><HotelPhoto hotel={hotel}/><h3>{hotel.name}</h3><p>{hotel.location}</p><span className="room-label">{hotel.room}</span><button className="research-button" disabled={job?.state === 'queued' || job?.state === 'running' || busy === `research-${hotel.id}`} onClick={() => perform(`research-${hotel.id}`, () => requestResearch({ tripId: selectedId, hotelId: hotel.id }), `Research queued for ${hotel.name}.`)}>{job?.state === 'queued' || job?.state === 'running' ? <><LoaderCircle size={14} className="spin"/> Researching…</> : <><RefreshCw size={14}/> {job?.state === 'complete' ? 'Refresh sources' : 'Research page'}</>}</button>{job?.error && <small className="research-error">{job.error}</small>}</th>})}</tr></thead><tbody>{featureKeys.map(key => <tr key={key}><th scope="row"><strong>{featureLabels[key]}</strong><span>{requirementLabel(key, trip.requirements)}</span></th>{trip.hotels.map(hotel => { const finding = evaluate(hotel, key, trip.requirements); return <td key={hotel.id}><button className={`finding finding-${finding.state}`} onClick={() => setPanel({ type: 'source', hotel, feature: key })}><span className="finding-value">{finding.state === 'confirmed' ? <Check size={15}/> : finding.state === 'unknown' ? <CircleHelp size={15}/> : finding.state === 'conflict' || finding.state === 'mismatch' ? <span className="alert-symbol">!</span> : <FileText size={14}/>} {finding.label}</span><small>{({ 'not-required': 'Not part of this trip', unknown: 'Ask the hotel', conflict: 'Clarification needed', mismatch: 'Outside your requirement', published: 'Published information', confirmed: 'Hotel stated' })[finding.state]}</small></button></td>})}</tr>)}<tr className="availability-row"><th><strong>Room availability</strong><span>For your travel dates</span></th>{trip.hotels.map(hotel => <td key={hotel.id}><span className={hotel.availability === 'confirmed' ? 'available' : 'pending'}>{hotel.availability === 'confirmed' ? 'Hotel says available' : hotel.availability === 'unavailable' ? 'Unavailable' : 'Not confirmed'}</span><small>{hotel.availabilityNote ?? 'Separate from room features'}</small></td>)}</tr></tbody><tfoot><tr><td><ShieldCheck size={17}/><span>Evidence, not a suitability guarantee.</span></td>{trip.hotels.map(hotel => <td key={hotel.id}><button className="secondary full" onClick={() => setPanel({ type: 'inquiry', hotel })}><Mail size={15}/> Review questions <ArrowRight size={15}/></button></td>)}</tr></tfoot></table></div><div className="legend"><span><i className="legend-dot published"/> Published</span><span><i className="legend-dot confirmed"/> Hotel stated</span><span><i className="legend-dot unknown"/> Unknown</span><span><i className="legend-dot conflict"/> Conflicting or outside requirement</span><p>Always check the room type and source.</p></div></> : <section className="activity-panel"><h2>Your trip’s paper trail</h2>{events?.map(event => <div className="activity-item" key={event.id}><span className={`timeline-dot ${event.kind.includes('sent') || event.kind.includes('processed') ? 'green' : ''}`}/><div><strong>{event.message}</strong><p>{new Date(event.at).toLocaleString()}</p></div></div>)}{!events?.length && <p className="form-note">Activity appears here as research and inquiries progress.</p>}</section>}
        {tab === 'comparison' && <MobileComparison trip={trip} research={research} busy={busy} onResearch={hotel => perform(`research-${hotel.id}`, () => requestResearch({ tripId: selectedId, hotelId: hotel.id }), `Research queued for ${hotel.name}.`)} onSource={(hotel, feature) => setPanel({ type: 'source', hotel, feature })} onInquiry={hotel => setPanel({ type: 'inquiry', hotel })}/>} 
      </>}
    </main></div>
    {panel?.type === 'new' && <Modal title="Where are you thinking of staying?" description="Start with your shortlist. No booking or payment needed." close={() => setPanel(null)}><HotelDiscovery busy={busy === 'new'} save={async trip => { setBusy('new'); try { const id = await createTrip({ data: trip }); setSelectedId(id); setPanel(null); setNotice('Trip created. No evidence has been invented.') } finally { setBusy('') } }}/></Modal>}
    {trip && selectedId && panel?.type === 'requirements' && <Modal title="The details you need" description="Requirements apply to every hotel in this trip." close={() => setPanel(null)}><RequirementsForm initial={trip.requirements} busy={busy === 'requirements'} save={requirements => perform('requirements', async () => { await updateRequirements({ id: selectedId, requirements, revision }); setPanel(null) }, 'Requirements updated. Every answer was compared again.')}/></Modal>}
    {trip && panel?.type === 'source' && (() => { const finding = evaluate(panel.hotel, panel.feature, trip.requirements); return <Modal title={featureLabels[panel.feature]} description={`${panel.hotel.name} · ${panel.hotel.room}`} close={() => setPanel(null)}><div className={`source-summary finding-${finding.state}`}><strong>{finding.label}</strong><p>{finding.detail}</p><span>Your requirement: {requirementLabel(panel.feature, trip.requirements)}</span></div>{finding.sources.length ? finding.sources.map(source => <article className="evidence-card" key={source.id}><div className="evidence-heading"><span>{source.source === 'hotel' ? <Mail size={16}/> : <FileText size={16}/>} {source.source === 'hotel' ? 'Hotel statement' : 'Published information'}</span><time>{new Date(source.recordedAt).toLocaleDateString()}</time></div><blockquote>“{source.quote}”</blockquote><p>{source.sourceLabel}</p><small>Applies to: {source.room}</small>{source.url && <a href={source.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14}/></a>}</article>) : <div className="empty-evidence"><CircleHelp size={30}/><h3>A specific answer is still missing.</h3><p>General “accessible room” language cannot answer this question.</p></div>}<div className="dialog-footer"><button className="primary" onClick={() => setPanel({ type: 'inquiry', hotel: panel.hotel })}>Review hotel questions <ArrowRight size={17}/></button></div></Modal> })()}
    {trip && selectedId && panel?.type === 'inquiry' && <InquiryEditor hotel={panel.hotel} trip={trip} revision={revision} latest={inquiries?.find(item => item.hotelId === panel.hotel.id)} attempts={(inquiries ?? []).filter(item => item.hotelId === panel.hotel.id && ['approved', 'sending', 'sent', 'uncertain'].includes(item.state)).length} close={() => setPanel(null)} saveDraft={({ recipient, subject, body, revision }) => saveInquiry({ tripId: selectedId, hotelId: panel.hotel.id, recipient, subject, body, tripRevision: revision })} approve={async id => { await approveInquiry({ inquiryId: id }); setNotice('One email send was approved. Status will update here.') }}/>} 
  </div>
}
