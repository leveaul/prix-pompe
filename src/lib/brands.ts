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
  'Avia':          { label: 'Avia',          emoji: '🔴', color: '#e3000f' },
  'Dyneff':        { label: 'Dyneff',        emoji: '⛽', color: '#64748b' },
  'Q8':            { label: 'Q8',            emoji: '🟡', color: '#f5a500' },
  'Netto':         { label: 'Netto',         emoji: '🟡', color: '#f0c300' },
  'PEM':           { label: 'PEM',           emoji: '⛽', color: '#64748b' },
}

export function getBrandInfo(brand: string, address?: string): BrandInfo {
  if (brand && BRAND_MAP[brand]) return BRAND_MAP[brand]
  // Use first meaningful word of address as label if no brand
  const label = address
    ? address.replace(/^\d+[\s,]+/, '').split(',')[0].trim().slice(0, 28) || 'Station'
    : 'Station'
  return { label, emoji: '⛽', color: '#64748b' }
}
