export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatPrice(price: number): string {
  return price.toFixed(3) + ' €/L'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000)
    if (diffH < 1) return 'il y a moins d\'1h'
    if (diffH < 24) return `il y a ${diffH}h`
    const diffD = Math.round(diffH / 24)
    return `il y a ${diffD}j`
  } catch {
    return ''
  }
}
