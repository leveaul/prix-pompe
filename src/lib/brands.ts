export interface BrandInfo {
  label: string
  emoji: string
  color: string
}

const BRAND_MAP: Record<string, BrandInfo> = {
  'Intermarché':                    { label: 'Intermarché',   emoji: '🔴', color: '#e3000f' },
  'Groupement Des Mousquetaires':   { label: 'Intermarché',   emoji: '🔴', color: '#e3000f' },
  'Carrefour':                      { label: 'Carrefour',     emoji: '🔵', color: '#004dac' },
  'E.Leclerc':                      { label: 'E.Leclerc',     emoji: '🔵', color: '#003189' },
  'TotalEnergies':                  { label: 'TotalEnergies', emoji: '🔴', color: '#e30613' },
  'Esso':                           { label: 'Esso',          emoji: '🔵', color: '#003087' },
  'Super U':                        { label: 'Super U',       emoji: '🔴', color: '#c8102e' },
  'La Station U':                   { label: 'Super U',       emoji: '🔴', color: '#c8102e' },
  'Auchan':                         { label: 'Auchan',        emoji: '🟠', color: '#e85100' },
  'Casino':                         { label: 'Casino',        emoji: '🟢', color: '#007a33' },
  'BP':                             { label: 'BP',            emoji: '🟢', color: '#007a33' },
  'Shell':                          { label: 'Shell',         emoji: '🟡', color: '#f5a500' },
  'Avia':                           { label: 'Avia',          emoji: '🔴', color: '#e3000f' },
  'Netto':                          { label: 'Netto',         emoji: '🟡', color: '#f0c300' },
  'Dyneff':                         { label: 'Dyneff',        emoji: '⛽', color: '#64748b' },
  'Q8':                             { label: 'Q8',            emoji: '🟡', color: '#f5a500' },
  'PEM':                            { label: 'PEM',           emoji: '⛽', color: '#64748b' },
  'Elan':                           { label: 'Elan',          emoji: '🟢', color: '#00843d' },
  'Eni':                            { label: 'Eni',           emoji: '🟡', color: '#f5c400' },
  'Cora':                           { label: 'Cora',          emoji: '🔴', color: '#e2001a' },
  'Vito':                           { label: 'Vito',          emoji: '⛽', color: '#64748b' },
  'Bi1':                            { label: 'Bi1',           emoji: '🔵', color: '#0055a4' },
  'Esso Express':                   { label: 'Esso',          emoji: '🔵', color: '#003087' },
}

export function getBrandInfo(brand: string, address?: string): BrandInfo {
  if (brand && BRAND_MAP[brand]) return BRAND_MAP[brand]
  // Marque non répertoriée mais connue : on l'affiche quand même proprement
  if (brand && brand.length > 1) return { label: brand, emoji: '⛽', color: '#64748b' }
  // Pas de marque : affiche l'adresse
  const label = address
    ? address.replace(/^\d+[\s,]+/, '').split(',')[0].trim().slice(0, 28) || 'Station'
    : 'Station'
  return { label, emoji: '⛽', color: '#64748b' }
}
