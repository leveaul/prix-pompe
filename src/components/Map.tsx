'use client'

import { useEffect, useRef } from 'react'
import type { Station } from '@/lib/types'
import { FUEL_COLORS } from '@/lib/types'
import { formatPrice, formatDistance, haversineDistance } from '@/lib/utils'

interface Props {
  stations: Station[]
  userLat: number
  userLon: number
  selectedId: string | null
  onSelect: (id: string) => void
  activeFuel: string
}

export default function Map({ stations, userLat, userLon, selectedId, onSelect, activeFuel }: Props) {
  const mapRef = useRef<unknown>(null)
  const markersRef = useRef<globalThis.Map<string, unknown>>(new globalThis.Map())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamic import to avoid SSR
    import('leaflet').then(L => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [userLat, userLon],
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // User location marker
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid #fff;box-shadow:0 0 0 3px rgba(245,158,11,0.4)" class="pulse-dot"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([userLat, userLon], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div style="padding:8px;font-weight:600;color:#f59e0b">📍 Ma position</div>')

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).remove()
        mapRef.current = null
        markersRef.current.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers when stations change
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then(L => {
      const map = mapRef.current as ReturnType<typeof L.map>

      // Remove old markers
      markersRef.current.forEach(m => (m as ReturnType<typeof L.marker>).remove())
      markersRef.current.clear()

      stations.forEach(station => {
        const fuelToShow = activeFuel
          ? station.fuels.find(f => f.name === activeFuel)
          : station.fuels.reduce((a, b) => (a.price < b.price ? a : b), station.fuels[0])

        if (!fuelToShow) return

        const color = FUEL_COLORS[fuelToShow.name] ?? '#64748b'
        const isSelected = selectedId === station.id
        const dist = haversineDistance(userLat, userLon, station.lat, station.lon)

        const icon = L.divIcon({
          html: `
            <div style="
              background:${isSelected ? color : '#161a24'};
              border:2px solid ${color};
              border-radius:8px;
              padding:3px 6px;
              font-size:11px;
              font-weight:700;
              color:${isSelected ? '#0d0f14' : color};
              white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.5);
              transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition:all 0.2s;
            ">
              ${fuelToShow.price.toFixed(3)}
            </div>
          `,
          className: '',
          iconSize: [60, 26],
          iconAnchor: [30, 26],
        })

        const popupContent = `
          <div style="padding:12px;min-width:200px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${station.name || station.brand || 'Station'}</div>
            <div style="color:#94a3b8;font-size:12px;margin-bottom:10px;">${station.address} · ${formatDistance(dist)}</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              ${station.fuels.map(f => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#0d0f14;border-radius:6px;">
                  <span style="color:${FUEL_COLORS[f.name] ?? '#64748b'};font-weight:600;font-size:12px;">${f.name}</span>
                  <span style="font-weight:700;font-size:13px;">${formatPrice(f.price)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `

        const marker = L.marker([station.lat, station.lon], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 260 })
          .on('click', () => onSelect(station.id))

        markersRef.current.set(station.id, marker)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, selectedId, activeFuel])

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const station = stations.find(s => s.id === selectedId)
    if (!station) return

    import('leaflet').then(L => {
      const map = mapRef.current as ReturnType<typeof L.map>
      map.panTo([station.lat, station.lon], { animate: true })
      const marker = markersRef.current.get(selectedId) as ReturnType<typeof L.marker> | undefined
      if (marker) marker.openPopup()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
