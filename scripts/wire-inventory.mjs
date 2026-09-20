import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/LiveApp.tsx'
let source = readFileSync(path, 'utf8')
const start = source.indexOf('function NewTripForm('), end = source.indexOf('function InquiryEditor(', start)
if (start >= 0 && end > start) source = source.slice(0, start) + source.slice(end)
source = source.replace('defaultRequirements, ', '').replace('validateTrip, ', '')
if (!source.includes("from './HotelDiscovery'")) source = "import { HotelDiscovery } from './HotelDiscovery'\n" + source
if (!source.includes("from './HotelPhoto'")) source = "import { HotelPhoto } from './HotelPhoto'\n" + source
source = source.replace('<NewTripForm ', '<HotelDiscovery ')
source = source.replace('trip.hotels.map((hotel, index) => { const job', 'trip.hotels.map((hotel) => { const job')
const art = '<div className={`hotel-art art-${index}`} aria-hidden="true"><div className="building"><i/><i/><i/><i/><i/><i/><i/><i/></div><span>{String(index + 1).padStart(2, \'0\')}</span></div>'
source = source.replace(art, '<HotelPhoto hotel={hotel}/>')
source = source.replace('Add one to three official hotel pages. AccessRelay will keep published evidence, hotel answers, and unknowns separate.', 'Find real hotels, choose a room, and check the details that matter. Published evidence, hotel answers, and unknowns stay separate.')
writeFileSync(path, source)
