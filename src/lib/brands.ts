export interface BrandInfo {
  label: string
  color: string
  logo: string | null
}

const BRAND_MAP: Record<string, BrandInfo> = {
  'TotalEnergies': { label: 'TotalEnergies', color: '#e30613', logo: 'https://logo.clearbit.com/totalenergies.com' },
  'Intermarché':   { label: 'Intermarché',   color: '#e3000f', logo: 'https://logo.clearbit.com/intermarche.com' },
  'Carrefour':     { label: 'Carrefour',     color: '#004dac', logo: 'https://logo.clearbit.com/carrefour.fr' },
  'E.Leclerc':     { label: 'E.Leclerc',     color: '#003189', logo: 'https://logo.clearbit.com/e.leclerc' },
  'Super U':       { label: 'Super U',       color: '#c8102e', logo: 'https://logo.clearbit.com/magasins-u.com' },
  'Esso':          { label: 'Esso',          color: '#003087', logo: 'https://logo.clearbit.com/esso.fr' },
  'Avia':          { label: 'Avia',          color: '#e3000f', logo: 'https://logo.clearbit.com/avia.fr' },
  'Auchan':        { label: 'Auchan',        color: '#e85100', logo: 'https://logo.clearbit.com/auchan.fr' },
  'BP':            { label: 'BP',            color: '#007a33', logo: 'https://logo.clearbit.com/bp.com' },
  'Shell':         { label: 'Shell',         color: '#f5a500', logo: 'https://logo.clearbit.com/shell.com' },
  'Eni':           { label: 'Eni',           color: '#f5c400', logo: 'https://logo.clearbit.com/eni.com' },
  'Elan':          { label: 'Elan',          color: '#00843d', logo: 'https://logo.clearbit.com/elan.fr' },
  'Netto':         { label: 'Netto',         color: '#f0c300', logo: 'https://logo.clearbit.com/netto.fr' },
  'Casino':        { label: 'Casino',        color: '#007a33', logo: 'https://logo.clearbit.com/groupe-casino.fr' },
  'Dyneff':        { label: 'Dyneff',        color: '#0066cc', logo: 'https://logo.clearbit.com/dyneff.com' },
  'Q8':            { label: 'Q8',            color: '#f5a500', logo: 'https://logo.clearbit.com/q8.fr' },
  'Cora':          { label: 'Cora',          color: '#e2001a', logo: 'https://logo.clearbit.com/cora.fr' },
  'Vito':          { label: 'Vito',          color: '#ff6600', logo: null },
  'Bi1':           { label: 'Bi1',           color: '#0055a4', logo: null },
  'PEM':           { label: 'PEM',           color: '#003087', logo: null },
}

const DEFAULT: BrandInfo = { label: 'Station', color: '#64748b', logo: null }

export function getBrandInfo(brand: string, address?: string): BrandInfo {
  if (brand && BRAND_MAP[brand]) return BRAND_MAP[brand]
  if (brand && brand.length > 1) return { label: brand, color: '#64748b', logo: null }
  const label = address
    ? address.replace(/^\d+[\s,]+/, '').split(',')[0].trim().slice(0, 28) || 'Station'
    : 'Station'
  return { ...DEFAULT, label }
}
