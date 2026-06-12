export interface Fuel {
  name: string
  price: number
  updated: string | null
}

export interface Station {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lon: number
  fuels: Fuel[]
  services: string[]
  brand: string
  updated: string | null
  distance?: number
}

export const FUEL_TYPES = [
  { id: '', label: 'Tous', color: '#64748b' },
  { id: 'Gazole', label: 'Gazole', color: '#3b82f6' },
  { id: 'SP95', label: 'SP95', color: '#22c55e' },
  { id: 'SP98', label: 'SP98', color: '#f59e0b' },
  { id: 'E10', label: 'E10', color: '#8b5cf6' },
  { id: 'E85', label: 'E85', color: '#ec4899' },
  { id: 'GPLc', label: 'GPLc', color: '#14b8a6' },
]

export const FUEL_COLORS: Record<string, string> = {
  Gazole: '#3b82f6',
  SP95: '#22c55e',
  SP98: '#f59e0b',
  E10: '#8b5cf6',
  E85: '#ec4899',
  GPLc: '#14b8a6',
}

export const RADIUS_OPTIONS = [
  { value: '2000', label: '2 km' },
  { value: '5000', label: '5 km' },
  { value: '10000', label: '10 km' },
  { value: '20000', label: '20 km' },
]
