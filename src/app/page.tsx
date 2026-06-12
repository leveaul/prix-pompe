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
      <span style={{ color: '#64748b', fontSize: '14px' }}>Chargement de la carte…</span>
    </div>
  ),
})

type LocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lat: number; lon: number }
  | { status: 'error'; message: string }

const PEEK_H = 80
const HALF_RATIO = 0.44
const FULL_RATIO = 0.86

export default function Home() {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFuel, setActiveFuel] = useState('')
  const [radius, setRadius] = useState('5000')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance')
  const [isMobile, setIsMobile] = useState(false)
  const [winH, setWinH] = useState(700)
  const [sheetH, setSheetH] = useState(PEEK_H)

  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)
  const isAnimating = useRef(false)

  useEffect(() => {
    const update = () => { setIsMobile(window.innerWidth < 768); setWinH(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const peekH = PEEK_H
  const halfH = Math.round(winH * HALF_RATIO)
  const fullH = Math.round(winH * FULL_RATIO)

  const snapTo = useCallback((target: 'peek' | 'half' | 'full') => {
    const h = target === 'peek' ? peekH : target === 'half' ? halfH : fullH
    isAnimating.current = true
    setSheetH(h)
    setTimeout(() => { isAnimating.current = false }, 300)
  }, [peekH, halfH, fullH])

  const fetchStations = useCallback(async (lat: number, lon: number, fuel: string, rad: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stations?lat=${lat}&lon=${lon}&fuel=${encodeURIComponent(fuel)}&radius=${rad}`)
      const data = await res.json()
      if (data.stations) {
        const withDist = data.stations.map((s: Station) => ({
          ...s, distance: haversineDistance(lat, lon, s.lat, s.lon),
        }))
        withDist.sort((a: Station, b: Station) => (a.distance ?? 0) - (b.distance ?? 0))
        setStations(withDist)
        if (withDist.length > 0) snapTo('half')
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [snapTo])

  const requestLocation = useCallback(() => {
    setLocation({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        setLocation({ status: 'ready', lat, lon })
        fetchStations(lat, lon, activeFuel, radius)
      },
      () => setLocation({ status: 'error', message: 'Localisation refusée.' }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [activeFuel, radius, fetchStations])

  useEffect(() => {
    if (location.status === 'ready') fetchStations(location.lat, location.lon, activeFuel, radius)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFuel, radius])

  // Drag
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartH.current = sheetH
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const delta = dragStartY.current - e.clientY
    const newH = Math.max(peekH, Math.min(fullH, dragStartH.current + delta))
    setSheetH(newH)
  }
  const onPointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    // snap to nearest
    const snaps = [peekH, halfH, fullH]
    const closest = snaps.reduce((a, b) => Math.abs(a - sheetH) < Math.abs(b - sheetH) ? a : b)
    setSheetH(closest)
  }

  // Sorted stations
  const sortedStations = [...stations].sort((a, b) => {
    if (sortBy === 'price') {
      const getPrice = (s: Station) => {
        const fuels = activeFuel ? s.fuels.filter(f => f.name === activeFuel) : s.fuels
        return fuels.length > 0 ? Math.min(...fuels.map(f => f.price)) : Infinity
      }
      return getPrice(a) - getPrice(b)
    }
    return (a.distance ?? 0) - (b.distance ?? 0)
  })

  const cheapestByFuel: Record<string, number> = {}
  FUEL_TYPES.slice(1).forEach(({ id }) => {
    const prices = stations.flatMap(s => s.fuels.filter(f => f.name === id).map(f => f.price))
    if (prices.length > 0) cheapestByFuel[id] = Math.min(...prices)
  })

  const isSheetUp = sheetH > peekH + 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0f14', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '52px', flexShrink: 0, zIndex: 200,
        background: '#0d0f14', borderBottom: '1px solid #1e2d40',
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

      {/* Fuel filters */}
      <div style={{
        display: 'flex', gap: '6px', padding: '8px 12px',
        background: '#0d0f14', borderBottom: '1px solid #1e2d40',
        overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none',
      }}>
        {FUEL_TYPES.map(fuel => (
          <button key={fuel.id} onClick={() => setActiveFuel(fuel.id)} style={{
            background: activeFuel === fuel.id ? fuel.color : '#161a24',
            border: `1px solid ${activeFuel === fuel.id ? fuel.color : '#1e2d40'}`,
            borderRadius: '99px', flexShrink: 0,
            color: activeFuel === fuel.id ? '#0d0f14' : '#94a3b8',
            fontSize: '12px', fontWeight: 700, padding: '5px 12px',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {fuel.label}
            {fuel.id && cheapestByFuel[fuel.id] && (
              <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.75 }}>
                {cheapestByFuel[fuel.id].toFixed(3)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Map */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: isMobile ? 0 : '360px',
          // On mobile, shrink map so it never goes behind the sheet
          bottom: isMobile ? `${sheetH}px` : 0,
          transition: isDragging.current ? 'none' : 'bottom 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}>
          {location.status === 'ready' ? (
            <Map
              stations={sortedStations}
              userLat={location.lat}
              userLon={location.lon}
              selectedId={selectedId}
              onSelect={id => { setSelectedId(id === selectedId ? null : id); if (isMobile) snapTo('half') }}
              activeFuel={activeFuel}
              bottomOffset={sheetH}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ fontSize: '52px', opacity: 0.15 }}>⛽</div>
              <p style={{ color: '#475569', fontSize: '14px', textAlign: 'center', padding: '0 32px', lineHeight: 1.6 }}>
                {location.status === 'loading' ? 'Localisation en cours…' : 'Autorisez la localisation pour voir les prix près de vous'}
              </p>
              {(location.status === 'idle' || location.status === 'error') && (
                <>
                  {location.status === 'error' && <p style={{ color: '#ef4444', fontSize: '12px' }}>{location.message}</p>}
                  <button onClick={requestLocation} style={{
                    background: '#f59e0b', color: '#0d0f14', border: 'none',
                    borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  }}>📍 Me localiser</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Floating action button — visible only when sheet is peeking */}
        {isMobile && !isSheetUp && location.status === 'ready' && (
          <button
            onClick={() => snapTo('half')}
            style={{
              position: 'absolute',
              bottom: `${peekH + 16}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 150,
              background: '#f59e0b',
              color: '#0d0f14',
              border: 'none',
              borderRadius: '99px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            ≡ {loading ? 'Chargement…' : `${stations.length} station${stations.length > 1 ? 's' : ''}`}
          </button>
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '360px',
            background: '#0d0f14', borderLeft: '1px solid #1e2d40',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <SidebarContent location={location} stations={sortedStations} loading={loading}
              selectedId={selectedId} activeFuel={activeFuel} radius={radius}
              onSelect={id => setSelectedId(id === selectedId ? null : id)}
              sortBy={sortBy} onSortChange={setSortBy} onLocate={requestLocation} />
          </aside>
        )}

        {/* Mobile bottom sheet */}
        {isMobile && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: `${sheetH}px`,
            background: '#0d0f14',
            borderTop: '1px solid #1e2d40',
            borderRadius: '18px 18px 0 0',
            transition: isDragging.current ? 'none' : 'height 0.28s cubic-bezier(0.32,0.72,0,1)',
            display: 'flex', flexDirection: 'column',
            zIndex: 100,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
            willChange: 'height',
          }}>
            {/* Drag handle */}
            <div
              style={{
                padding: '10px 0 8px', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                cursor: 'ns-resize', touchAction: 'none', userSelect: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#2d3f55' }} />
              <div style={{ fontSize: '11px', color: '#475569', pointerEvents: 'none' }}>
                {loading ? '⏳ Recherche…'
                  : stations.length > 0 ? `${stations.length} station${stations.length > 1 ? 's' : ''} · ${RADIUS_OPTIONS.find(o => o.value === radius)?.label}`
                  : location.status === 'ready' ? 'Aucune station'
                  : ''}
              </div>
            </div>

            {/* Content scrollable */}
            <div style={{ flex: 1, overflowY: sheetH > peekH + 20 ? 'auto' : 'hidden', padding: '0 10px 20px' }}>
              {location.status !== 'ready' && location.status !== 'loading' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
                  <button onClick={requestLocation} style={{
                    background: '#f59e0b', color: '#0d0f14', border: 'none',
                    borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}>📍 Me localiser</button>
                </div>
              )}
              <SidebarContent location={location} stations={sortedStations} loading={loading}
                selectedId={selectedId} activeFuel={activeFuel} radius={radius}
                sortBy={sortBy} onSortChange={setSortBy}
                onSelect={id => { setSelectedId(id === selectedId ? null : id); snapTo('half') }}
                onLocate={requestLocation} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarContent({ location, stations, loading, selectedId, activeFuel, radius, sortBy, onSortChange, onSelect, onLocate }: {
  location: LocationState; stations: Station[]; loading: boolean
  selectedId: string | null; activeFuel: string; radius: string
  sortBy: 'distance' | 'price'; onSortChange: (s: 'distance' | 'price') => void
  onSelect: (id: string) => void; onLocate: () => void
}) {
  if (location.status === 'idle' || location.status === 'error') {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        {location.status === 'error' && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{location.message}</p>}
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📍</div>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
          Autorisez la localisation pour voir les prix en temps réel.
        </p>
        <button onClick={onLocate} style={{
          background: '#f59e0b', color: '#0d0f14', border: 'none',
          borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>Me localiser</button>
      </div>
    )
  }
  if (location.status === 'loading') {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Localisation…</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Sort toggle */}
      {stations.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
          {(['distance', 'price'] as const).map(s => (
            <button key={s} onClick={() => onSortChange(s)} style={{
              flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
              background: sortBy === s ? '#f59e0b' : '#161a24',
              color: sortBy === s ? '#0d0f14' : '#64748b',
              border: `1px solid ${sortBy === s ? '#f59e0b' : '#1e2d40'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {s === 'distance' ? '📍 Distance' : '💰 Prix croissant'}
            </button>
          ))}
        </div>
      )}
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#161a24', borderRadius: '10px', height: '76px', opacity: 1 - i * 0.15 }} />
          ))
        : stations.length === 0
          ? <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>Aucune station dans ce rayon.</div>
          : stations.map(station => (
              <StationCard key={station.id} station={station}
                userLat={location.lat} userLon={location.lon}
                selected={selectedId === station.id}
                activeFuel={activeFuel}
                onClick={() => onSelect(station.id)} />
            ))
      }
    </div>
  )
}
