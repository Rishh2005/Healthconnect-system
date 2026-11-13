import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OverpassElement = {
  id: number
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}
type NearbyHospital = {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string
  phone: string
  website: string
  distanceKm: number
  source: 'OpenStreetMap'
}

const requestTimes = new Map<string, number>()
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const radians = (degree: number) => degree * Math.PI / 180
  const dLat = radians(bLat - aLat)
  const dLon = radians(bLon - aLon)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
function clean(value: unknown, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  let body: { latitude?: unknown; longitude?: unknown; radius?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const radius = Number(body.radius ?? 10000)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || ![5000, 10000, 20000].includes(radius)) {
    return NextResponse.json({ error: 'Enter a valid location and search radius.' }, { status: 400 })
  }

  const now = Date.now()
  if (requestTimes.get(user.id) && now - (requestTimes.get(user.id) ?? 0) < 15000) {
    return NextResponse.json({ error: 'Please wait a moment before searching again.' }, { status: 429, headers: { 'Retry-After': '15' } })
  }
  requestTimes.set(user.id, now)
  if (requestTimes.size > 5000) {
    for (const [id, time] of requestTimes) if (now - time > 60_000) requestTimes.delete(id)
  }

  const query = `[out:json][timeout:18];(nwr["amenity"~"^(hospital|clinic)$"](around:${radius},${latitude},${longitude});nwr["healthcare"~"^(hospital|clinic)$"](around:${radius},${latitude},${longitude}););out center 60;`
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'HealthConnect/1.0 nearby-facility-search' },
      body: new URLSearchParams({ data: query }),
      cache: 'no-store',
      signal: AbortSignal.timeout(22000),
    })
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? 'The map service is busy. Please try again shortly.' : 'Nearby facility search is temporarily unavailable.' }, { status: response.status === 429 ? 503 : 502 })
    const result = await response.json() as { elements?: OverpassElement[] }
    const seen = new Set<string>()
    const hospitals: NearbyHospital[] = (result.elements ?? []).flatMap(element => {
      const tags = element.tags ?? {}
      const point = element.center ?? (element.lat !== undefined && element.lon !== undefined ? { lat: element.lat, lon: element.lon } : null)
      if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return []
      const key = `${clean(tags.name || tags['name:en'] || element.id).toLowerCase()}-${point.lat.toFixed(3)}-${point.lon.toFixed(3)}`
      if (seen.has(key)) return []
      seen.add(key)
      const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(' ')
      const website = clean(tags['contact:website'] || tags.website, 500)
      const safeWebsite = /^https?:\/\//i.test(website) ? website : ''
      return [{
        id: `${element.type}/${element.id}`,
        name: clean(tags.name || tags['name:en'] || tags.operator, 160) || 'Unnamed health facility',
        latitude: point.lat,
        longitude: point.lon,
        address: clean(address),
        phone: clean(tags['contact:phone'] || tags.phone, 40),
        website: safeWebsite,
        distanceKm: Number(distanceKm(latitude, longitude, point.lat, point.lon).toFixed(1)),
        source: 'OpenStreetMap' as const,
      }]
    }).filter(item => item.distanceKm <= radius / 1000).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 40)
    return NextResponse.json({ hospitals, attribution: 'Map data © OpenStreetMap contributors', searchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Nearby facility search is temporarily unavailable.' }, { status: 503 })
  }
}
