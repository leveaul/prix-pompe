export interface BrandInfo {
  label: string
  emoji: string
  color: string
}

const BRAND_MAP: Record<string, BrandInfo> = {
  'Intermarché':   { label: 'Intermarché',   emoji: '🔴', color: '#e3000f' },
  'Carrefour':     { label: 'Carrefour',     emoji: '🔵', color: '#004dac' },
  'E.Leclerc':     { label: 'E.Leclerc',     emoji: '🔵', color: '#003189' },
  'Auchan':        { label: 'Auchan',        emoji: '🟠', color: '#e85100' },
  'Super U':       { label: 'Super U',       emoji: '🔴', color: '#c8102e' },
  'Casino':        { label: 'Casino',        emoji: '🟢', color: '#007a33' },
  'TotalEnergies': { label: 'TotalEnergies', emoji: '🔴', color: '#e30613' },
  'BP':            { label: 'BP',            emoji: '🟢', color: '#007a33' },
  'Shell':         { label: 'Shell',         emoji: '🟡', color: '#f5a500' },
  'Esso':          { label: 'Esso',          emoji: '🔵', color: '#003087' },
  'Autoroute':     { label: 'Autoroute',     emoji: '🛣️', color: '#64748b' },
}

const DEFAULT: BrandInfo = { label: 'Station', emoji: '⛽', color: '#64748b' }

export function getBrandInfo(brand: string): BrandInfo {
  return BRAND_MAP[brand] ?? DEFAULT
}
