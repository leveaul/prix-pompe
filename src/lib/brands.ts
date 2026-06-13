export interface BrandInfo {
  label: string
  color: string
  logo: string | null  // URL du logo, null = pas de logo
}

// Logos via Google Favicons (32px, toujours dispo) + Wikimedia pour les grandes enseignes
const BRAND_MAP: Record<string, BrandInfo> = {
  'Intermarché':                  { label: 'Intermarché',   color: '#e3000f', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/Intermarche.svg/200px-Intermarche.svg.png' },
  'Groupement Des Mousquetaires': { label: 'Intermarché',   color: '#e3000f', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/Intermarche.svg/200px-Intermarche.svg.png' },
  'Carrefour':                    { label: 'Carrefour',     color: '#004dac', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/200px-Carrefour_logo.svg.png' },
  'E.Leclerc':                    { label: 'E.Leclerc',     color: '#003189', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/E.Leclerc_logo.svg/200px-E.Leclerc_logo.svg.png' },
  'TotalEnergies':                { label: 'TotalEnergies', color: '#e30613', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Logo_TotalEnergies.svg/200px-Logo_TotalEnergies.svg.png' },
  'BP':                           { label: 'BP',            color: '#007a33', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BP_Helios_logo.svg/200px-BP_Helios_logo.svg.png' },
  'Shell':                        { label: 'Shell',         color: '#f5a500', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Shell_logo.svg/200px-Shell_logo.svg.png' },
  'Esso':                         { label: 'Esso',          color: '#003087', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/twenty/Esso_logo.svg/200px-Esso_logo.svg.png' },
  'Esso Express':                 { label: 'Esso',          color: '#003087', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/twenty/Esso_logo.svg/200px-Esso_logo.svg.png' },
  'Auchan':                       { label: 'Auchan',        color: '#e85100', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Logo_Auchan.svg/200px-Logo_Auchan.svg.png' },
  'Super U':                      { label: 'Super U',       color: '#c8102e', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Logo_Syst%C3%A8me_U.svg/200px-Logo_Syst%C3%A8me_U.svg.png' },
  'La Station U':                 { label: 'Super U',       color: '#c8102e', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Logo_Syst%C3%A8me_U.svg/200px-Logo_Syst%C3%A8me_U.svg.png' },
  'Casino':                       { label: 'Casino',        color: '#007a33', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Logo_Casino.svg/200px-Logo_Casino.svg.png' },
  'Netto':                        { label: 'Netto',         color: '#f0c300', logo: null },
  'Avia':                         { label: 'Avia',          color: '#e3000f', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Avia_International_logo.svg/200px-Avia_International_logo.svg.png' },
  'Dyneff':                       { label: 'Dyneff',        color: '#0066cc', logo: null },
  'Q8':                           { label: 'Q8',            color: '#f5a500', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Q8_Logo.svg/200px-Q8_Logo.svg.png' },
  'Eni':                          { label: 'Eni',           color: '#f5c400', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Eni_logo_%28new%29.svg/200px-Eni_logo_%28new%29.svg.png' },
  'Cora':                         { label: 'Cora',          color: '#e2001a', logo: null },
  'Elan':                         { label: 'Elan',          color: '#00843d', logo: null },
  'Vito':                         { label: 'Vito',          color: '#ff6600', logo: null },
  'Bi1':                          { label: 'Bi1',           color: '#0055a4', logo: null },
  'PEM':                          { label: 'PEM',           color: '#003087', logo: null },
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
