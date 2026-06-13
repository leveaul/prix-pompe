export interface BrandInfo {
  label: string
  short: string   // label court pour les markers carte
  color: string
  logo: string | null
}

// Logos SVG inline encodés en base64 ou URLs Wikipedia stables
const BRAND_MAP: Record<string, BrandInfo> = {
  'TotalEnergies': { label: 'TotalEnergies', short: 'Total',      color: '#e30613', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Logo_TotalEnergies.svg/120px-Logo_TotalEnergies.svg.png' },
  'Intermarché':   { label: 'Intermarché',   short: 'Intermarché',color: '#e3000f', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/Intermarche.svg/120px-Intermarche.svg.png' },
  'Carrefour':     { label: 'Carrefour',     short: 'Carrefour',  color: '#004dac', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/120px-Carrefour_logo.svg.png' },
  'E.Leclerc':     { label: 'E.Leclerc',     short: 'Leclerc',    color: '#003189', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/E.Leclerc_logo.svg/120px-E.Leclerc_logo.svg.png' },
  'Super U':       { label: 'Super U',       short: 'Super U',    color: '#c8102e', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Logo_Syst%C3%A8me_U.svg/120px-Logo_Syst%C3%A8me_U.svg.png' },
  'Esso':          { label: 'Esso',          short: 'Esso',       color: '#0057a8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Esso_Logo.svg/120px-Esso_Logo.svg.png' },
  'Avia':          { label: 'Avia',          short: 'Avia',       color: '#e3000f', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Avia_International_logo.svg/120px-Avia_International_logo.svg.png' },
  'Auchan':        { label: 'Auchan',        short: 'Auchan',     color: '#e85100', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Logo_Auchan.svg/120px-Logo_Auchan.svg.png' },
  'BP':            { label: 'BP',            short: 'BP',         color: '#007a33', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BP_Helios_logo.svg/120px-BP_Helios_logo.svg.png' },
  'Shell':         { label: 'Shell',         short: 'Shell',      color: '#f5a500', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Shell_logo.svg/120px-Shell_logo.svg.png' },
  'Eni':           { label: 'Eni',           short: 'Eni',        color: '#f5c400', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Eni_logo_%28new%29.svg/120px-Eni_logo_%28new%29.svg.png' },
  'Elan':          { label: 'Elan',          short: 'Elan',       color: '#00843d', logo: null },
  'Netto':         { label: 'Netto',         short: 'Netto',      color: '#f0c300', logo: null },
  'Casino':        { label: 'Casino',        short: 'Casino',     color: '#007a33', logo: null },
  'Dyneff':        { label: 'Dyneff',        short: 'Dyneff',     color: '#0066cc', logo: null },
  'Q8':            { label: 'Q8',            short: 'Q8',         color: '#f5a500', logo: null },
  'Cora':          { label: 'Cora',          short: 'Cora',       color: '#e2001a', logo: null },
  'Vito':          { label: 'Vito',          short: 'Vito',       color: '#ff6600', logo: null },
  'Bi1':           { label: 'Bi1',           short: 'Bi1',        color: '#0055a4', logo: null },
  'PEM':           { label: 'PEM',           short: 'PEM',        color: '#003087', logo: null },
}

const DEFAULT: BrandInfo = { label: 'Station', short: 'Station', color: '#64748b', logo: null }

export function getBrandInfo(brand: string, address?: string): BrandInfo {
  if (brand && BRAND_MAP[brand]) return BRAND_MAP[brand]
  if (brand && brand.length > 1) return { label: brand, short: brand.slice(0, 8), color: '#64748b', logo: null }
  const label = address
    ? address.replace(/^\d+[\s,]+/, '').split(',')[0].trim().slice(0, 28) || 'Station'
    : 'Station'
  return { ...DEFAULT, label }
}
