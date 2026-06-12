import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

const FUEL_COLS = [
  { col: 'gazole_prix', maj: 'gazole_maj', name: 'Gazole' },
  { col: 'sp95_prix',   maj: 'sp95_maj',   name: 'SP95'   },
  { col: 'sp98_prix',   maj: 'sp98_maj',   name: 'SP98'   },
  { col: 'e10_prix',    maj: 'e10_maj',    name: 'E10'    },
  { col: 'e85_prix',    maj: 'e85_maj',    name: 'E85'    },
  { col: 'gplc_prix',   maj: 'gplc_maj',   name: 'GPLc'   },
]

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function normalizeBrand(raw: string): string {
  if (!raw) return ''
  const s = raw.toLowerCase().trim()
  if (/intermarché|intermarche/.test(s)) return 'Intermarché'
  if (/carrefour/.test(s)) return 'Carrefour'
  if (/e\.?\s*leclerc|leclerc/.test(s)) return 'E.Leclerc'
  if (/totalenergies|total access|total\b/.test(s)) return 'TotalEnergies'
  if (/\bbp\b/.test(s)) return 'BP'
  if (/shell/.test(s)) return 'Shell'
  if (/esso/.test(s)) return 'Esso'
  if (/auchan/.test(s)) return 'Auchan'
  if (/super\s*u\b/.test(s)) return 'Super U'
  if (/\bcasino\b/.test(s)) return 'Casino'
  if (/\bnetto\b/.test(s)) return 'Netto'
  if (/\bavia\b/.test(s)) return 'Avia'
  if (/dyneff/.test(s)) return 'Dyneff'
  if (/\bq8\b/.test(s)) return 'Q8'
  if (raw.length > 2 && raw.length < 40 && !/^\d|^rue|^avenue|^boulevard/i.test(raw)) {
    return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  return ''
}

interface OsmElement { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

async function fetchOverpassBrands(lat: number, lon: number, radiusM: number): Promise<Array<{ lat: number; lon: number; brand: string }>> {
  const r = Math.min(radiusM + 1000, 25000)
  // Use application/x-www-form-urlencoded WITHOUT Accept header — Overpass returns JSON when [out:json] is in query
  const query = `[out:json][timeout:10];(node["amenity"="fuel"](around:${r},${lat},${lon});way["amenity"="fuel"](around:${r},${lat},${lon}););out center tags;`
  
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
    // No Accept header — let Overpass decide based on [out:json]
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  
  if (!res.ok) {
    console.error('Overpass error:', res.status, await res.text().catch(() => ''))
    return []
  }
  
  const data = await res.json()
  return ((data.elements ?? []) as OsmElement[]).map(el => ({
    lat: el.lat ?? el.center?.lat ?? 0,
    lon: el.lon ?? el.center?.lon ?? 0,
    brand: normalizeBrand(el.tags?.brand ?? el.tags?.operator ?? el.tags?.name ?? ''),
  })).filter(s => s.lat !== 0)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const fuel = searchParams.get('fuel') || ''
  const radius = parseInt(searchParams.get('radius') ?? '5000')
  if (isNaN(lat) || isNaN(lon)) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })

  try {
    const distanceClause = `distance(geom, geom'POINT(${lon} ${lat})', ${radius}m)`
    const fuelColEntry = fuel ? FUEL_COLS.find(f => f.name === fuel) : null
    const fuelClause = fuelColEntry ? ` AND ${fuelColEntry.col} IS NOT NULL` : ''

    const govUrl = new URL(FUEL_API)
    govUrl.searchParams.set('where', distanceClause + fuelClause)
    govUrl.searchParams.set('limit', '100')
    govUrl.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const [govRes, osmStations] = await Promise.all([
      fetch(govUrl.toString(), { cache: 'no-store' }),
      fetchOverpassBrands(lat, lon, radius).catch(() => []),
    ])

    if (!govRes.ok) return NextResponse.json({ error: `Upstream ${govRes.status}` }, { status: 502 })
    const govData = await govRes.json()

    const stations = (govData.results ?? []).map((r: Record<string, unknown>) => {
      const geom = r.geom as { lat?: number; lon?: number } | null
      const stLat = geom?.lat ?? 0
      const stLon = geom?.lon ?? 0

      // Match nearest OSM station within 150m
      let brand = ''
      let bestDist = 150
      for (const osm of osmStations) {
        const d = haversine(stLat, stLon, osm.lat, osm.lon)
        if (d < bestDist) { bestDist = d; brand = osm.brand }
      }

      const fuels = FUEL_COLS
        .filter(f => r[f.col] != null)
        .map(f => ({ name: f.name, price: parseFloat(String(r[f.col])), updated: (r[f.maj] as string) ?? null }))

      return {
        id: String(r.id), name: brand,
        address: String(r.adresse ?? ''), city: String(r.ville ?? ''),
        lat: stLat, lon: stLon, brand,
        pop: String(r.pop ?? ''),
        services: (r.services_service as string[]) ?? [],
        fuels,
      }
    }).filter((s: { lat: number; lon: number; fuels: unknown[] }) => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0)

    return NextResponse.json({ stations, osm_count: osmStations.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
