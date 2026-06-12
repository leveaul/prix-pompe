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

// Detect brand from services list and address
function detectBrandFromServices(services: string[], adresse: string, pop: string): string {
  const text = [...services, adresse].join(' ').toLowerCase()
  if (/intermarché|intermarche/.test(text)) return 'Intermarché'
  if (/carrefour/.test(text)) return 'Carrefour'
  if (/leclerc/.test(text)) return 'E.Leclerc'
  if (/auchan/.test(text)) return 'Auchan'
  if (/super u|superu/.test(text)) return 'Super U'
  if (/casino/.test(text)) return 'Casino'
  if (/total/.test(text)) return 'TotalEnergies'
  if (/bp\b/.test(text)) return 'BP'
  if (/shell/.test(text)) return 'Shell'
  if (/esso/.test(text)) return 'Esso'
  if (pop === 'A') return 'Autoroute'
  return ''
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const fuel = searchParams.get('fuel') || ''
  const radius = searchParams.get('radius') || '5000'
  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })

  try {
    const distanceClause = `distance(geom, geom'POINT(${lon} ${lat})', ${radius}m)`
    const fuelColEntry = fuel ? FUEL_COLS.find(f => f.name === fuel) : null
    const fuelClause = fuelColEntry ? ` AND ${fuelColEntry.col} IS NOT NULL` : ''

    const url = new URL(FUEL_API)
    url.searchParams.set('where', distanceClause + fuelClause)
    url.searchParams.set('limit', '100')
    url.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 })

    const data = await res.json()
    const raw: Record<string, unknown>[] = data.results ?? []

    const stations = raw.map(r => {
      const geom = r.geom as { lon?: number; lat?: number } | null
      const stLat = geom?.lat ?? 0
      const stLon = geom?.lon ?? 0
      const services = (r.services_service as string[]) ?? []
      const brand = detectBrandFromServices(services, String(r.adresse ?? ''), String(r.pop ?? ''))

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
        services,
        fuels,
      }
    }).filter(s => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0)

    return NextResponse.json({ stations })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
