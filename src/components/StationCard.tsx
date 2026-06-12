'use client'

import type { Station } from '@/lib/types'
import { FUEL_COLORS } from '@/lib/types'
import { formatDistance, formatDate, haversineDistance } from '@/lib/utils'

interface Props {
  station: Station
  userLat: number
  userLon: number
  selected: boolean
  activeFuel: string
  onClick: () => void
}

export default function StationCard({ station, userLat, userLon, selected, activeFuel, onClick }: Props) {
  const dist = haversineDistance(userLat, userLon, station.lat, station.lon)

  const primaryFuel = activeFuel
    ? station.fuels.find(f => f.name === activeFuel)
    : station.fuels.reduce((a, b) => (a.price < b.price ? a : b), station.fuels[0])

  const displayFuels = activeFuel
    ? station.fuels.filter(f => f.name === activeFuel)
    : station.fuels

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? '#1e2436' : '#161a24',
        border: `1px solid ${selected ? '#f59e0b44' : '#1e2d40'}`,
        borderLeft: selected ? '3px solid #f59e0b' : '3px solid transparent',
        borderRadius: '10px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      className="hover:bg-[#1a2030] fade-in"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: '13px',
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {station.name || station.brand || 'Station-service'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {station.address}
          </div>
        </div>
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginLeft: '8px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          📍 {formatDistance(dist)}
        </div>
      </div>

      {/* Fuel prices */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {displayFuels.sort((a, b) => a.price - b.price).map(fuel => (
          <div
            key={fuel.name}
            style={{
              background: `${FUEL_COLORS[fuel.name] ?? '#64748b'}15`,
              border: `1px solid ${FUEL_COLORS[fuel.name] ?? '#64748b'}40`,
              borderRadius: '6px',
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: FUEL_COLORS[fuel.name] ?? '#64748b',
            }}>
              {fuel.name}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
              {fuel.price.toFixed(3)} €
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {primaryFuel?.updated && (
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
          Mis à jour {formatDate(primaryFuel.updated)}
        </div>
      )}
    </div>
  )
}
