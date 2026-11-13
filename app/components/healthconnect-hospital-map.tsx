"use client"

import dynamic from 'next/dynamic'
import { FormEvent, useMemo, useState } from 'react'
import { ArrowRight, LocateFixed, MapPin, MessageCircle, Navigation, Phone, Search, ShieldCheck } from 'lucide-react'

type Organization = { id: string; name: string; address: string; phone: string; website_url: string; latitude: number | null; longitude: number | null }
type NearbyFacility = { id: string; name: string; latitude: number; longitude: number; address: string; phone: string; website: string; distanceKm: number; source: 'OpenStreetMap' }
type Pin = { id: string; name: string; latitude: number; longitude: number; address: string; phone: string; website: string; distanceKm?: number; verified: boolean; organizationId?: string }
const HospitalMapCanvas = dynamic(() => import('./healthconnect-leaflet-canvas'), { ssr: false, loading: () => <div className="hcv-map-loading" role="status">Preparing the interactive map…</div> })

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const rad = (value: number) => value * Math.PI / 180
  const x = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export default function HealthConnectHospitalMap({ organizations, onBook, onMessage }: { organizations: Organization[]; onBook: (organizationId: string) => void; onMessage: (organizationId: string) => void }) {
  const [center, setCenter] = useState<[number, number] | null>(null)
  const [manualLatitude, setManualLatitude] = useState('')
  const [manualLongitude, setManualLongitude] = useState('')
  const [radius, setRadius] = useState(10000)
  const [nearby, setNearby] = useState<NearbyFacility[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Pin | null>(null)

  const verifiedPins: Pin[] = useMemo(() => organizations.flatMap(organization => {
    if (organization.latitude === null || organization.longitude === null) return []
    return [{ id: `verified-${organization.id}`, organizationId: organization.id, name: organization.name, address: organization.address, phone: organization.phone, website: organization.website_url, latitude: organization.latitude, longitude: organization.longitude, verified: true }]
  }), [organizations])
  const visibleVerified = useMemo(() => verifiedPins.filter(pin => !center || distanceKm(center[0], center[1], pin.latitude, pin.longitude) <= radius / 1000), [verifiedPins, center, radius])
  const pins: Pin[] = useMemo(() => [
    ...visibleVerified,
    ...nearby.map(item => ({ ...item, verified: false })),
  ], [visibleVerified, nearby])

  async function search(latitude: number, longitude: number) {
    setCenter([latitude, longitude])
    setManualLatitude(latitude.toFixed(5))
    setManualLongitude(longitude.toFixed(5))
    setSearching(true)
    setError('')
    setSelected(null)
    try {
      const response = await fetch('/api/hospitals/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, radius }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Search is temporarily unavailable.')
      setNearby(Array.isArray(result.hospitals) ? result.hospitals : [])
    } catch (reason) {
      setNearby([])
      setError(reason instanceof Error ? reason.message : 'Search is temporarily unavailable.')
    } finally {
      setSearching(false)
    }
  }

  function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('This browser does not provide location access. Enter coordinates instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      result => void search(result.coords.latitude, result.coords.longitude),
      () => setError('Location access was not granted. Enter coordinates to search nearby.'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  }

  function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(manualLatitude)
    const longitude = Number(manualLongitude)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Enter a valid latitude and longitude.')
      return
    }
    void search(latitude, longitude)
  }

  const results = [...visibleVerified, ...nearby.map(item => ({ ...item, verified: false as const }))]
    .sort((a, b) => (a.verified ? distanceKm(center?.[0] ?? a.latitude, center?.[1] ?? a.longitude, a.latitude, a.longitude) : a.distanceKm ?? 0) - (b.verified ? distanceKm(center?.[0] ?? b.latitude, center?.[1] ?? b.longitude, b.latitude, b.longitude) : b.distanceKm ?? 0))

  return <>
    <div className="hcv-page-header"><div><div className="hcv-eyebrow">CARE, CLOSE TO HOME</div><h1>Find a hospital</h1><p>Search nearby healthcare locations, then choose a verified HealthConnect facility to request a visit or message its team.</p></div></div>
    <section className="hcv-map-search-card" aria-label="Hospital search">
      <div className="hcv-map-search-copy"><span className="hcv-map-search-icon"><MapPin size={18}/></span><div><b>Where should we look?</b><small>Your location is used for this search only and is not saved to your profile.</small></div></div>
      <form className="hcv-map-coordinates" onSubmit={submitCoordinates}>
        <label>Latitude<input inputMode="decimal" type="number" step="any" min="-90" max="90" value={manualLatitude} onChange={event => setManualLatitude(event.target.value)} placeholder="37.7749" aria-label="Latitude"/></label>
        <label>Longitude<input inputMode="decimal" type="number" step="any" min="-180" max="180" value={manualLongitude} onChange={event => setManualLongitude(event.target.value)} placeholder="-122.4194" aria-label="Longitude"/></label>
        <label>Distance<select value={radius} onChange={event => setRadius(Number(event.target.value))}><option value={5000}>5 km</option><option value={10000}>10 km</option><option value={20000}>20 km</option></select></label>
        <button className="hcv-primary-button hcv-map-search-button" disabled={searching}><Search size={15}/>{searching ? 'Searching…' : 'Search nearby'}</button>
      </form>
      <button type="button" className="hcv-location-button" onClick={useCurrentLocation}><LocateFixed size={15}/> Use my current location</button>
      {error && <p className="hcv-form-error" role="alert">{error}</p>}
    </section>

    <div className="hcv-map-layout">
      <section className="hcv-map-frame" aria-label="Map of nearby hospitals">
        <HospitalMapCanvas center={center} pins={pins} onSelect={pin => setSelected(pins.find(candidate => candidate.id === pin.id) ?? null)}/>
        <div className="hcv-map-legend"><span><i className="hcv-legend-verified"/> Verified on HealthConnect</span><span><i className="hcv-legend-public"/> Public map listing</span></div>
      </section>
      <aside className="hcv-map-results">
        <div className="hcv-card-heading"><div><div className="hcv-eyebrow">NEARBY OPTIONS</div><h2>{center ? `${results.length} places found` : 'Verified facilities'}</h2></div><span className="hcv-count-pill">{results.length}</span></div>
        <div className="hcv-map-result-list">
          {results.length ? results.map(pin => <button className={`hcv-map-result ${selected?.id === pin.id ? 'is-selected' : ''}`} key={pin.id} onClick={() => setSelected(pin)}>
            <span className={`hcv-map-result-icon ${pin.verified ? 'is-verified' : ''}`}>{pin.verified ? <ShieldCheck size={16}/> : <MapPin size={16}/>}</span>
            <span className="hcv-map-result-copy"><b>{pin.name}</b><small>{pin.verified ? 'Verified facility' : `${pin.distanceKm?.toFixed(1) ?? '—'} km away`}</small>{pin.address && <small>{pin.address}</small>}</span><ArrowRight size={14}/>
          </button>) : <div className="hcv-map-empty"><Navigation size={19}/><b>{center ? 'No nearby matches' : 'Start with your location'}</b><p>{center ? 'Try a wider search radius or another location.' : 'Use location access or enter coordinates to find nearby places.'}</p></div>}
        </div>
        {selected && <section className="hcv-map-selected" aria-live="polite"><div className="hcv-map-selected-heading"><div><span className="hcv-eyebrow">{selected.verified ? 'VERIFIED HEALTHCONNECT FACILITY' : 'PUBLIC MAP LISTING'}</span><h3>{selected.name}</h3></div><button className="hcv-small-icon" onClick={() => setSelected(null)} aria-label="Close facility details">×</button></div>
          {selected.address && <p>{selected.address}</p>}
          {selected.verified && selected.organizationId ? <div className="hcv-map-actions"><button className="hcv-primary-button" onClick={() => onBook(selected.organizationId!)}>Request appointment <ArrowRight size={14}/></button><button className="hcv-soft-button" onClick={() => onMessage(selected.organizationId!)}><MessageCircle size={14}/> Message facility</button></div> : <div className="hcv-map-unverified"><p>This listing is from OpenStreetMap and is not verified in HealthConnect. Contact the facility directly to arrange care.</p><div>{selected.phone && <a href={`tel:${selected.phone}`}><Phone size={13}/> Call</a>}{selected.website && <a href={selected.website} target="_blank" rel="noreferrer">Website <ArrowRight size={12}/></a>}</div></div>}
        </section>}
        <p className="hcv-map-attribution">Map and nearby listing data © OpenStreetMap contributors. Listings may be incomplete; verify details directly with the facility.</p>
      </aside>
    </div>
  </>
}
