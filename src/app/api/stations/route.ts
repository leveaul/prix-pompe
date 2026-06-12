import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const FUEL_COLS = [
  { col: 'gazole_prix', maj: 'gazole_maj', name: 'Gazole' },
  { col: 'sp95_prix',   maj: 'sp95_maj',   name: 'SP95'   },
  { col: 'sp98_prix',   maj: 'sp98_maj',   name: 'SP98'   },
  { col: 'e10_prix',    maj: 'e10_maj',    name: 'E10'    },
  { col: 'e85_prix',    maj: 'e85_maj',    name: 'E85'    },
  { col: 'gplc_prix',   maj: 'gplc_maj',   name: 'GPLc'   },
]

interface OsmStation { lat: number; lon: number; brand: string; name: string }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function fetchOsmBrands(lat: number, lon: number, radiusM: number): Promise<OsmStation[]> {
  // Slightly larger radius to cover all stations
  const r = Math.min(radiusM + 500, 25000)
  const query = `[out:json][timeout:10];
(
  node["amenity"="fuel"](around:${r},${lat},${lon});
  way["amenity"="fuel"](around:${r},${lat},${lon});
);
out center tags;`

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()

  return (data.elements ?? []).map((el: Record<string, unknown>) => {
    const tags = (el.tags ?? {}) as Record<string, string>
    const lat = typeof el.lat === 'number' ? el.lat : (el.center as {lat:number})?.lat ?? 0
    const lon = typeof el.lon === 'number' ? el.lon : (el.center as {lon:number})?.lon ?? 0
    return {
      lat, lon,
      brand: tags.brand ?? tags.operator ?? '',
      name: tags.name ?? tags['brand:fr'] ?? '',
    }
  }).filter((s: OsmStation) => s.lat !== 0)
}

function normalizeBrand(raw: string): string {
  if (!raw) return ''
  const s = raw.toLowerCase().trim()
  if (/intermarché|intermarche/.test(s)) return 'Intermarché'
  if (/carrefour/.test(s)) return 'Carrefour'
  if (/e\.?\s*leclerc|leclerc/.test(s)) return 'E.Leclerc'
  if (/totalenergies|total/.test(s)) return 'TotalEnergies'
  if (/bp\b/.test(s)) return 'BP'
  if (/shell/.test(s)) return 'Shell'
  if (/esso/.test(s)) return 'Esso'
  if (/auchan/.test(s)) return 'Auchan'
  if (/super\s*u\b/.test(s)) return 'Super U'
  if (/casino/.test(s)) return 'Casino'
  if (/netto/.test(s)) return 'Netto'
  if (/avia/.test(s)) return 'Avia'
  if (/dyneff/.test(s)) return 'Dyneff'
  if (/q8/.test(s)) return 'Q8'
  if (/pétrole|petrol|pem\b/.test(s)) return 'PEM'
  // Return title-cased version of whatever is there
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const fuel = searchParams.get('fuel') || ''
  const radius = parseInt(searchParams.get('radius') ?? '5000')
  if (isNaN(lat) || isNaN(lon)) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })

  try {
    // Fetch gov prices + OSM brands in parallel
    const distanceClause = `distance(geom, geom'POINT(${lon} ${lat})', ${radius}m)`
    const fuelColEntry = fuel ? FUEL_COLS.find(f => f.name === fuel) : null
    const fuelClause = fuelColEntry ? ` AND ${fuelColEntry.col} IS NOT NULL` : ''

    const govUrl = new URL(FUEL_API)
    govUrl.searchParams.set('where', distanceClause + fuelClause)
    govUrl.searchParams.set('limit', '100')
    govUrl.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const [govRes, osmStations] = await Promise.all([
      fetch(govUrl.toString(), { cache: 'no-store' }),
      fetchOsmBrands(lat, lon, radius).catch(() => [] as OsmStation[]),
    ])

    if (!govRes.ok) return NextResponse.json({ error: `Upstream ${govRes.status}` }, { status: 502 })
    const govData = await govRes.json()

    const stations = (govData.results ?? []).map((r: Record<string, unknown>) => {
      const geom = r.geom as { lon?: number; lat?: number } | null
      const stLat = geom?.lat ?? 0
      const stLon = geom?.lon ?? 0

      // Match with OSM by proximity (within 150m)
      let brand = ''
      let bestDist = 150
      for (const osm of osmStations) {
        const d = haversine(stLat, stLon, osm.lat, osm.lon)
        if (d < bestDist) {
          bestDist = d
          brand = normalizeBrand(osm.brand || osm.name)
        }
      }

      const fuels = FUEL_COLS
        .filter(f => r[f.col] != null)
        .map(f => ({
          name: f.name,
          price: parseFloat(String(r[f.col])),
          updated: (r[f.maj] as string) ?? null,
        }))

      return {
        id: String(r.id),
        name: brand,
        address: String(r.adresse ?? ''),
        city: String(r.ville ?? ''),
        lat: stLat, lon: stLon,
        brand,
        pop: String(r.pop ?? ''),
        services: (r.services_service as string[]) ?? [],
        fuels,
      }
    }).filter((s: {lat: number; lon: number; fuels: unknown[]}) => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0)

    return NextResponse.json({ stations, osm_count: osmStations.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
