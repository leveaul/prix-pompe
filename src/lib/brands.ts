// Détection de la marque depuis le nom/adresse de la station
export interface BrandInfo {
  key: string
  label: string
  emoji: string
  color: string
  bgColor: string
}

const BRAND_PATTERNS: Array<{ patterns: RegExp; info: BrandInfo }> = [
  { patterns: /intermarche|intermarché/i, info: { key: 'intermarche', label: 'Intermarché', emoji: '🔴', color: '#e3000f', bgColor: '#fff0f0' } },
  { patterns: /carrefour/i,              info: { key: 'carrefour',   label: 'Carrefour',   emoji: '🔵', color: '#004dac', bgColor: '#f0f4ff' } },
  { patterns: /leclerc|e\.leclerc/i,     info: { key: 'leclerc',     label: 'E.Leclerc',   emoji: '🔵', color: '#003189', bgColor: '#f0f4ff' } },
  { patterns: /total|totalenergies/i,    info: { key: 'total',       label: 'TotalEnergies', emoji: '🔴', color: '#e30613', bgColor: '#fff0f0' } },
  { patterns: /bp\b/i,                   info: { key: 'bp',          label: 'BP',          emoji: '🟢', color: '#007a33', bgColor: '#f0fff4' } },
  { patterns: /shell/i,                  info: { key: 'shell',       label: 'Shell',       emoji: '🟡', color: '#f5a500', bgColor: '#fffbf0' } },
  { patterns: /esso/i,                   info: { key: 'esso',        label: 'Esso',        emoji: '🔵', color: '#003087', bgColor: '#f0f4ff' } },
  { patterns: /auchan/i,                 info: { key: 'auchan',      label: 'Auchan',      emoji: '🟠', color: '#e85100', bgColor: '#fff4f0' } },
  { patterns: /super u\b|super-u/i,      info: { key: 'superu',      label: 'Super U',     emoji: '🔴', color: '#c8102e', bgColor: '#fff0f2' } },
  { patterns: /\bu\b express|u express/i,info: { key: 'superu',      label: 'U Express',   emoji: '🔴', color: '#c8102e', bgColor: '#fff0f2' } },
  { patterns: /casino/i,                 info: { key: 'casino',      label: 'Casino',      emoji: '🟢', color: '#007a33', bgColor: '#f0fff4' } },
  { patterns: /netto/i,                  info: { key: 'netto',       label: 'Netto',       emoji: '🟡', color: '#f0c300', bgColor: '#fffdf0' } },
  { patterns: /avia/i,                   info: { key: 'avia',        label: 'Avia',        emoji: '🔴', color: '#e3000f', bgColor: '#fff0f0' } },
  { patterns: /dyneff/i,                 info: { key: 'dyneff',      label: 'Dyneff',      emoji: '⛽', color: '#f59e0b', bgColor: '#fffbf0' } },
  { patterns: /pétrole\s?de\s?la\s?manche/i, info: { key: 'pdlm',   label: 'PDM',         emoji: '⛽', color: '#64748b', bgColor: '#f8fafc' } },
]

const DEFAULT_BRAND: BrandInfo = { key: 'generic', label: 'Station', emoji: '⛽', color: '#64748b', bgColor: '#1e2d40' }

export function detectBrand(name: string, address: string): BrandInfo {
  const text = `${name} ${address}`
  for (const { patterns, info } of BRAND_PATTERNS) {
    if (patterns.test(text)) return info
  }
  return DEFAULT_BRAND
}
