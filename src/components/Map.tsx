'use client'
import { useEffect, useRef } from 'react'
import type { Station } from '@/lib/types'
import { FUEL_COLORS } from '@/lib/types'
import { formatPrice, formatDistance, haversineDistance } from '@/lib/utils'
import { getBrandInfo } from '@/lib/brands'

interface Props {
  stations: Station[]
  userLat: number; userLon: number
  selectedId: string | null
  onSelect: (id: string) => void
  activeFuel: string
  bottomOffset?: number
}

export default function Map({ stations, userLat, userLon, selectedId, onSelect, activeFuel, bottomOffset = 0 }: Props) {
  const mapRef = useRef<unknown>(null)
  const markersRef = useRef<globalThis.Map<string, unknown>>(new globalThis.Map())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    import('leaflet').then(L => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const map = L.map(containerRef.current!, { center: [userLat, userLon], zoom: 13 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f59e0b;border:3px solid #fff;box-shadow:0 0 0 3px rgba(245,158,11,0.35)" class="pulse-dot"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })
      L.marker([userLat, userLon], { icon: userIcon }).addTo(map)
        .bindPopup('<div style="padding:6px 8px;font-weight:600;color:#f59e0b;font-size:13px;">📍 Ma position</div>')
      mapRef.current = map
    })
    return () => {
      if (mapRef.current) { (mapRef.current as { remove: () => void }).remove(); mapRef.current = null; markersRef.current.clear() }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(L => {
      const map = mapRef.current as ReturnType<typeof L.map>
      markersRef.current.forEach(m => (m as ReturnType<typeof L.marker>).remove())
      markersRef.current.clear()

      stations.forEach(station => {
        const fuelToShow = activeFuel
          ? station.fuels.find(f => f.name === activeFuel)
          : station.fuels.reduce((a, b) => a.price < b.price ? a : b, station.fuels[0])
        if (!fuelToShow) return

        const fuelColor = FUEL_COLORS[fuelToShow.name] ?? '#64748b'
        const isSelected = selectedId === station.id
        const dist = haversineDistance(userLat, userLon, station.lat, station.lon)
        const brand = getBrandInfo(station.brand)

        const icon = L.divIcon({
          html: `
            <div style="display:flex;align-items:center;gap:3px;background:${isSelected ? fuelColor : '#161a24'};border:2px solid ${fuelColor};border-radius:10px;padding:3px 7px 3px 5px;font-size:11px;font-weight:700;color:${isSelected ? '#0d0f14' : fuelColor};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.55);transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};transition:all 0.15s;">
              <span style="font-size:12px;line-height:1">${brand.emoji}</span>
              <span>${fuelToShow.price.toFixed(3)}</span>
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${fuelColor};margin:0 auto;"></div>
          `,
          className: '', iconSize: [76, 32], iconAnchor: [38, 32],
        })

        const popup = `
          <div style="padding:10px 12px;min-width:185px;font-family:system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:20px">${brand.emoji}</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#f1f5f9">${brand.label}</div>
                <div style="font-size:11px;color:#64748b">${station.address}${station.city ? ', ' + station.city : ''}</div>
              </div>
            </div>
            <div style="font-size:10px;color:#475569;margin-bottom:7px;">📍 ${formatDistance(dist)}</div>
            ${station.fuels.sort((a,b) => a.price - b.price).map(f => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 7px;background:#0d0f14;border-radius:5px;margin-bottom:2px;">
                <span style="color:${FUEL_COLORS[f.name] ?? '#64748b'};font-weight:700;font-size:11px">${f.name}</span>
                <span style="font-weight:700;font-size:12px;color:#f1f5f9">${formatPrice(f.price)}</span>
              </div>`).join('')}
          </div>`

        const marker = L.marker([station.lat, station.lon], { icon })
          .addTo(map).bindPopup(popup, { maxWidth: 230 })
          .on('click', () => onSelect(station.id))
        markersRef.current.set(station.id, marker)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, selectedId, activeFuel])

  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const station = stations.find(s => s.id === selectedId)
    if (!station) return
    import('leaflet').then(L => {
      const map = mapRef.current as ReturnType<typeof L.map>
      const pt = map.latLngToContainerPoint([station.lat, station.lon])
      const shifted = L.point(pt.x, pt.y + bottomOffset / 3)
      map.panTo(map.containerPointToLatLng(shifted), { animate: true })
      const marker = markersRef.current.get(selectedId) as ReturnType<typeof L.marker> | undefined
      if (marker) setTimeout(() => marker.openPopup(), 300)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
