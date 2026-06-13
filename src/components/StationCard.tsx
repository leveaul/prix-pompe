'use client'
import { useState } from 'react'
import type { Station } from '@/lib/types'
import { FUEL_COLORS } from '@/lib/types'
import { formatDistance, formatDate, haversineDistance } from '@/lib/utils'
import { getBrandInfo } from '@/lib/brands'

interface Props {
  station: Station
  userLat: number; userLon: number
  selected: boolean
  activeFuel: string
  onClick: () => void
}

function BrandLogo({ logo, label, color }: { logo: string | null; label: string; color: string }) {
  const [failed, setFailed] = useState(false)
  if (!logo || failed) {
    // Fallback: cercle coloré avec initiales
    const initials = label.slice(0, 2).toUpperCase()
    return (
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: color, color: '#fff',
        fontSize: 9, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{initials}</div>
    )
  }
  return (
    <img
      src={logo}
      onError={() => setFailed(true)}
      style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

export default function StationCard({ station, userLat, userLon, selected, activeFuel, onClick }: Props) {
  const dist = haversineDistance(userLat, userLon, station.lat, station.lon)
  const brand = getBrandInfo(station.brand, station.address)
  const displayFuels = activeFuel
    ? station.fuels.filter(f => f.name === activeFuel)
    : [...station.fuels].sort((a, b) => a.price - b.price)

  return (
    <div onClick={onClick} style={{
      background: selected ? '#1a2436' : '#161a24',
      border: `1px solid ${selected ? '#f59e0b55' : '#1e2d40'}`,
      borderLeft: `3px solid ${selected ? '#f59e0b' : 'transparent'}`,
      borderRadius: '10px', padding: '10px 12px',
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <BrandLogo logo={brand.logo} label={brand.label} color={brand.color} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {brand.label}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {station.address}{station.city ? `, ${station.city}` : ''}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px', flexShrink: 0 }}>
          📍 {formatDistance(dist)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {displayFuels.map(fuel => (
          <div key={fuel.name} style={{
            background: `${FUEL_COLORS[fuel.name] ?? '#64748b'}18`,
            border: `1px solid ${FUEL_COLORS[fuel.name] ?? '#64748b'}40`,
            borderRadius: '6px', padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: FUEL_COLORS[fuel.name] ?? '#64748b' }}>{fuel.name}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>{fuel.price.toFixed(3)} €</span>
          </div>
        ))}
      </div>

      {displayFuels[0]?.updated && (
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '5px' }}>
          Màj {formatDate(displayFuels[0].updated)}
        </div>
      )}
    </div>
  )
}
