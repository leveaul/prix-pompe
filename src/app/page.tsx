'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
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

export default function Home() {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFuel, setActiveFuel] = useState('')
  const [radius, setRadius] = useState('5000')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchStations = useCallback(async (lat: number, lon: number, fuel: string, rad: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stations?lat=${lat}&lon=${lon}&fuel=${fuel}&radius=${rad}`)
      const data = await res.json()
      if (data.stations) {
        const withDist = data.stations.map((s: Station) => ({
          ...s,
          distance: haversineDistance(lat, lon, s.lat, s.lon),
        }))
        withDist.sort((a: Station, b: Station) => (a.distance ?? 0) - (b.distance ?? 0))
        setStations(withDist)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const requestLocation = useCallback(() => {
    setLocation({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        setLocation({ status: 'ready', lat, lon })
        fetchStations(lat, lon, activeFuel, radius)
      },
      err => {
        setLocation({ status: 'error', message: 'Localisation refusée ou indisponible.' })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [activeFuel, radius, fetchStations])

  // Re-fetch when fuel or radius changes
  useEffect(() => {
    if (location.status === 'ready') {
      fetchStations(location.lat, location.lon, activeFuel, radius)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFuel, radius])

  const cheapestByFuel: Record<string, number> = {}
  if (stations.length > 0) {
    FUEL_TYPES.slice(1).forEach(({ id }) => {
      const prices = stations.flatMap(s => s.fuels.filter(f => f.name === id).map(f => f.price))
      if (prices.length > 0) cheapestByFuel[id] = Math.min(...prices)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0f14' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '56px',
        background: '#0d0f14',
        borderBottom: '1px solid #1e2d40',
        flexShrink: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⛽</span>
          <span style={{ fontWeight: 800, fontSize: '16px', color: '#f1f5f9', letterSpacing: '-0.3px' }}>
            Prix<span style={{ color: '#f59e0b' }}>Pompe</span>
          </span>
          {stations.length > 0 && (
            <span style={{
              background: '#1e2d40',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '99px',
              fontWeight: 600,
            }}>
              {stations.length} stations
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Radius select */}
          {location.status === 'ready' && (
            <select
              value={radius}
              onChange={e => setRadius(e.target.value)}
              style={{
                background: '#161a24',
                border: '1px solid #1e2d40',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '12px',
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              {RADIUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          {/* Toggle sidebar on mobile */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: '#161a24',
              border: '1px solid #1e2d40',
              borderRadius: '8px',
              color: '#94a3b8',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'none',
            }}
            className="mobile-sidebar-toggle"
          >
            {sidebarOpen ? '🗺' : '≡'}
          </button>
        </div>
      </header>

      {/* Fuel filter bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '8px 16px',
        background: '#0d0f14',
        borderBottom: '1px solid #1e2d40',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {FUEL_TYPES.map(fuel => (
          <button
            key={fuel.id}
            onClick={() => setActiveFuel(fuel.id)}
            style={{
              background: activeFuel === fuel.id ? fuel.color : '#161a24',
              border: `1px solid ${activeFuel === fuel.id ? fuel.color : '#1e2d40'}`,
              borderRadius: '99px',
              color: activeFuel === fuel.id ? '#0d0f14' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {fuel.label}
            {fuel.id && cheapestByFuel[fuel.id] && (
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                opacity: activeFuel === fuel.id ? 0.8 : 0.6,
              }}>
                {cheapestByFuel[fuel.id].toFixed(3)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{
            width: '320px',
            flexShrink: 0,
            background: '#0d0f14',
            borderRight: '1px solid #1e2d40',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {location.status === 'idle' || location.status === 'error' ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                {location.status === 'error' && (
                  <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {location.message}
                  </p>
                )}
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📍</div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
                  Autorisez la localisation pour voir les stations près de vous avec leurs prix en temps réel.
                </p>
                <button
                  onClick={requestLocation}
                  style={{
                    background: '#f59e0b',
                    color: '#0d0f14',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Me localiser
                </button>
              </div>
            ) : location.status === 'loading' ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Localisation en cours…
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2d40', fontSize: '11px', color: '#475569' }}>
                  {loading ? (
                    <span>Recherche en cours…</span>
                  ) : (
                    <span>{stations.length} station{stations.length > 1 ? 's' : ''} trouvée{stations.length > 1 ? 's' : ''} dans un rayon de {RADIUS_OPTIONS.find(o => o.value === radius)?.label}</span>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} style={{
                        background: '#161a24',
                        borderRadius: '10px',
                        height: '80px',
                        marginBottom: '6px',
                        opacity: 1 - i * 0.12,
                      }} />
                    ))
                  ) : stations.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
                      Aucune station trouvée dans ce rayon.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stations.map(station => (
                        <StationCard
                          key={station.id}
                          station={station}
                          userLat={location.lat}
                          userLon={location.lon}
                          selected={selectedId === station.id}
                          activeFuel={activeFuel}
                          onClick={() => setSelectedId(station.id === selectedId ? null : station.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}

        {/* Map */}
        <main style={{ flex: 1, position: 'relative' }}>
          {location.status === 'ready' ? (
            <Map
              stations={stations}
              userLat={location.lat}
              userLon={location.lon}
              selectedId={selectedId}
              onSelect={id => setSelectedId(id === selectedId ? null : id)}
              activeFuel={activeFuel}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              gap: '12px',
            }}>
              <div style={{ fontSize: '48px', opacity: 0.3 }}>🗺️</div>
              <p style={{ fontSize: '14px' }}>La carte s'affichera après localisation</p>
              {(location.status === 'idle' || location.status === 'error') && (
                <button
                  onClick={requestLocation}
                  style={{
                    background: '#f59e0b',
                    color: '#0d0f14',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                >
                  Me localiser
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
