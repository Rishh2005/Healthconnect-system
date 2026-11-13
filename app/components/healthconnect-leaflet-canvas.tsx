"use client"

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

type Pin = { id: string; name: string; latitude: number; longitude: number; address: string; verified: boolean }
const verifiedIcon = L.divIcon({ className: 'hcv-map-pin-shell', html: '<span class="hcv-map-pin hcv-map-pin-verified"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })
const publicIcon = L.divIcon({ className: 'hcv-map-pin-shell', html: '<span class="hcv-map-pin hcv-map-pin-public"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })

function MapViewport({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 0.7 })
  }, [center, map])
  return null
}

export default function HealthConnectLeafletCanvas({ center, pins, onSelect }: { center: [number, number] | null; pins: Pin[]; onSelect: (pin: Pin) => void }) {
  const initial = useMemo<[number, number]>(() => center ?? [20, 0], [])
  return <MapContainer center={initial} zoom={center ? 12 : 2} scrollWheelZoom className="hcv-leaflet-map" aria-label="Interactive map with hospital markers">
    <MapViewport center={center}/>
    <TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}/>
    {pins.map(pin => <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={pin.verified ? verifiedIcon : publicIcon} eventHandlers={{ click: () => onSelect(pin) }} alt={pin.name}>
      <Popup><div className="hcv-map-popup"><b>{pin.name}</b>{pin.address && <span>{pin.address}</span>}<small>{pin.verified ? 'Verified HealthConnect facility' : 'Public OpenStreetMap listing'}</small></div></Popup>
    </Marker>)}
    {center && <Marker position={center} alt="Your search location"><Popup>Your search location</Popup></Marker>}
  </MapContainer>
}
