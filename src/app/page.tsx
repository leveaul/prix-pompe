'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Station } from '@/lib/types'
import { FUEL_TYPES, RADIUS_OPTIONS } from '@/lib/types'
import { haversineDistance } from '@/lib/utils'
import StationCard from '@/components/StationCard'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#64748b', fontSize: '14px' }}>Chargement…</span>
    </div>
  ),
})

type LocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lat: number; lon: number }
  | { status: 'error'; message: string }

// Bottom sheet snap points (% of screen height from bottom)
const SNAP_PEEK = 120   // just the handle + count visible
const SNAP_HALF = 0.45  // 45% of screen
const SNAP_FULL = 0.85  // 85% of screen

export default function Home() {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFuel, setActiveFuel] = useState('')
  const [radius, setRadius] = useState('5000')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetSnap, setSheetSnap] = useState<'peek' | 'half' | 'full'>('peek')
  const [isMobile, setIsMobile] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ y: number; snap: string } | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchStations = useCallback(async (lat: number, lon: number, fuel: string, rad: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stations?lat=${lat}&lon=${lon}&fuel=${encodeURIComponent(fuel)}&radius=${rad}`)
      const data = await res.json()
      if (data.stations) {
        const withDist = data.stations.map((s: Station) => ({
          ...s,
          distance: haversineDistance(lat, lon, s.lat, s.lon),
        }))
        withDist.sort((a: Station, b: Station) => (a.distance ?? 0) - (b.distance ?? 0))
        setStations(withDist)
        if (withDist.length > 0 && isMobile) setSheetSnap('half')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isMobile])

  const requestLocation = useCallback(() => {
    setLocation({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        setLocation({ status: 'ready', lat, lon })
        fetchStations(lat, lon, activeFuel, radius)
        if (isMobile) setSheetSnap('half')
      },
      () => setLocation({ status: 'error', message: 'Localisation refusée.' }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [activeFuel, radius, fetchStations, isMobile])

  useEffect(() => {
    if (location.status === 'ready') {
      fetchStations(location.lat, location.lon, activeFuel, radius)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFuel, radius])

  // Drag handler for bottom sheet
  const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStart.current = { y, snap: sheetSnap }
  }

  const onDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragStart.current) return
    const y = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY
    const delta = dragStart.current.y - y
    if (Math.abs(delta) < 20) return

    if (delta > 60) {
      // drag up
      setSheetSnap(s => s === 'peek' ? 'half' : 'full')
    } else if (delta < -60) {
      // drag down
      setSheetSnap(s => s === 'full' ? 'half' : 'peek')
    }
    dragStart.current = null
  }

  const cheapestByFuel: Record<string, number> = {}
  if (stations.length > 0) {
    FUEL_TYPES.slice(1).forEach(({ id }) => {
      const prices = stations.flatMap(s => s.fuels.filter(f => f.name === id).map(f => f.price))
      if (prices.length > 0) cheapestByFuel[id] = Math.min(...prices)
    })
  }

  const sheetHeight = typeof window !== 'undefined'
    ? sheetSnap === 'peek' ? SNAP_PEEK : sheetSnap === 'half' ? window.innerHeight * SNAP_HALF : window.innerHeight * SNAP_FULL
    : 120

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0f14', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '52px',
        background: '#0d0f14', borderBottom: '1px solid #1e2d40',
        flexShrink: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⛽</span>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px' }}>
            Prix<span style={{ color: '#f59e0b' }}>Pompe</span>
          </span>
          {stations.length > 0 && (
            <span style={{ background: '#1e2d40', color: '#94a3b8', fontSize: '10px', padding: '2px 7px', borderRadius: '99px', fontWeight: 600 }}>
              {stations.length}
            </span>
          )}
        </div>
        {location.status === 'ready' && (
          <select value={radius} onChange={e => setRadius(e.target.value)} style={{
            background: '#161a24', border: '1px solid #1e2d40', borderRadius: '8px',
            color: '#94a3b8', fontSize: '12px', padding: '4px 8px', cursor: 'pointer',
          }}>
            {RADIUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </header>

      {/* ── Fuel filter bar ── */}
      <div style={{
        display: 'flex', gap: '6px', padding: '8px 12px',
        background: '#0d0f14', borderBottom: '1px solid #1e2d40',
        overflowX: 'auto', flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {FUEL_TYPES.map(fuel => (
          <button key={fuel.id} onClick={() => setActiveFuel(fuel.id)} style={{
            background: activeFuel === fuel.id ? fuel.color : '#161a24',
            border: `1px solid ${activeFuel === fuel.id ? fuel.color : '#1e2d40'}`,
            borderRadius: '99px',
            color: activeFuel === fuel.id ? '#0d0f14' : '#94a3b8',
            fontSize: '12px', fontWeight: 700, padding: '5px 12px',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '5px',
            flexShrink: 0,
          }}>
            {fuel.label}
            {fuel.id && cheapestByFuel[fuel.id] && (
              <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.8 }}>
                {cheapestByFuel[fuel.id].toFixed(3)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* MAP — full area on mobile, left side on desktop */}
        <div style={{
          position: 'absolute', inset: 0,
          ...((!isMobile) ? { right: '360px' } : {}),
        }}>
          {location.status === 'ready' ? (
            <Map
              stations={stations}
              userLat={location.lat}
              userLon={location.lon}
              selectedId={selectedId}
              onSelect={id => {
                setSelectedId(id === selectedId ? null : id)
                if (isMobile) setSheetSnap('half')
              }}
              activeFuel={activeFuel}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ fontSize: '52px', opacity: 0.2 }}>⛽</div>
              <p style={{ color: '#475569', fontSize: '14px', textAlign: 'center', padding: '0 32px', lineHeight: 1.6 }}>
                {location.status === 'loading'
                  ? 'Localisation en cours…'
                  : 'Autorisez la localisation pour voir les prix près de vous'}
              </p>
              {(location.status === 'idle' || location.status === 'error') && (
                <>
                  {location.status === 'error' && (
                    <p style={{ color: '#ef4444', fontSize: '12px' }}>{location.message}</p>
                  )}
                  <button onClick={requestLocation} style={{
                    background: '#f59e0b', color: '#0d0f14', border: 'none',
                    borderRadius: '10px', padding: '11px 24px', fontSize: '14px',
                    fontWeight: 700, cursor: 'pointer',
                  }}>
                    📍 Me localiser
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── DESKTOP sidebar ── */}
        {!isMobile && (
          <aside style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '360px',
            background: '#0d0f14', borderLeft: '1px solid #1e2d40',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <SidebarContent
              location={location}
              stations={stations}
              loading={loading}
              selectedId={selectedId}
              activeFuel={activeFuel}
              radius={radius}
              onSelect={id => setSelectedId(id === selectedId ? null : id)}
              onLocate={requestLocation}
            />
          </aside>
        )}

        {/* ── MOBILE bottom sheet ── */}
        {isMobile && (
          <div
            ref={sheetRef}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: `${sheetHeight}px`,
              background: '#0d0f14',
              borderTop: '1px solid #1e2d40',
              borderRadius: '16px 16px 0 0',
              transition: dragStart.current ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              display: 'flex', flexDirection: 'column',
              zIndex: 100,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}
            onTouchStart={onDragStart}
            onTouchEnd={onDragEnd}
            onMouseDown={onDragStart}
            onMouseUp={onDragEnd}
          >
            {/* Handle */}
            <div style={{ padding: '10px 0 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, cursor: 'grab' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#1e2d40' }} />
              <div style={{ fontSize: '11px', color: '#475569' }}>
                {loading ? 'Recherche…' : stations.length > 0
                  ? `${stations.length} station${stations.length > 1 ? 's' : ''} · ${RADIUS_OPTIONS.find(o => o.value === radius)?.label}`
                  : location.status === 'ready' ? 'Aucune station' : 'Touchez pour localiser'}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: sheetSnap !== 'peek' ? 'auto' : 'hidden', padding: '0 10px 16px' }}>
              <SidebarContent
                location={location}
                stations={stations}
                loading={loading}
                selectedId={selectedId}
                activeFuel={activeFuel}
                radius={radius}
                onSelect={id => setSelectedId(id === selectedId ? null : id)}
                onLocate={requestLocation}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Shared content between desktop sidebar and mobile sheet
function SidebarContent({
  location, stations, loading, selectedId, activeFuel, radius, onSelect, onLocate
}: {
  location: LocationState
  stations: Station[]
  loading: boolean
  selectedId: string | null
  activeFuel: string
  radius: string
  onSelect: (id: string) => void
  onLocate: () => void
}) {
  if (location.status === 'idle' || location.status === 'error') {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        {location.status === 'error' && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{location.message}</p>
        )}
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
          Autorisez la localisation pour voir les prix en temps réel.
        </p>
        <button onClick={onLocate} style={{
          background: '#f59e0b', color: '#0d0f14', border: 'none',
          borderRadius: '10px', padding: '10px 20px', fontSize: '13px',
          fontWeight: 700, cursor: 'pointer',
        }}>Me localiser</button>
      </div>
    )
  }

  if (location.status === 'loading') {
    return <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Localisation…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ background: '#161a24', borderRadius: '10px', height: '76px', opacity: 1 - i * 0.15 }} />
        ))
      ) : stations.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
          Aucune station dans ce rayon.
        </div>
      ) : (
        stations.map(station => (
          <StationCard
            key={station.id}
            station={station}
            userLat={location.lat}
            userLon={location.lon}
            selected={selectedId === station.id}
            activeFuel={activeFuel}
            onClick={() => onSelect(station.id)}
          />
        ))
      )}
    </div>
  )
}
