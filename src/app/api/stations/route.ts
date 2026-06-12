import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// v2 "améliorée" — une ligne par station, colonnes par carburant
const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

// Mapping colonnes API → noms affichés
const FUEL_COLS = [
  { col: 'gazole_prix',  maj: 'gazole_maj',  name: 'Gazole' },
  { col: 'sp95_prix',    maj: 'sp95_maj',    name: 'SP95'   },
  { col: 'sp98_prix',    maj: 'sp98_maj',    name: 'SP98'   },
  { col: 'e10_prix',     maj: 'e10_maj',     name: 'E10'    },
  { col: 'e85_prix',     maj: 'e85_maj',     name: 'E85'    },
  { col: 'gplc_prix',    maj: 'gplc_maj',    name: 'GPLc'   },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat  = searchParams.get('lat')
  const lon  = searchParams.get('lon')
  const fuel = searchParams.get('fuel') || ''
  const radius = searchParams.get('radius') || '5000'

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })
  }

  try {
    const distanceClause = `distance(geom, geom'POINT(${lon} ${lat})', ${radius}m)`

    // Si filtre carburant, on exclut les stations sans ce prix
    const fuelColEntry = fuel ? FUEL_COLS.find(f => f.name === fuel) : null
    const fuelClause = fuelColEntry ? ` AND ${fuelColEntry.col} IS NOT NULL` : ''

    const url = new URL(FUEL_API)
    url.searchParams.set('where', distanceClause + fuelClause)
    url.searchParams.set('limit', '100')
    url.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const res = await fetch(url.toString(), { cache: 'no-store' })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Upstream ${res.status}`, detail: text.slice(0, 300) }, { status: 502 })
    }

    const data = await res.json()
    const raw: Record<string, unknown>[] = data.results ?? []

    const stations = raw.map(r => {
      // Coordonnées — le champ geom est un objet {lon, lat} en WGS84
      const geom = r.geom as { lon?: number; lat?: number } | null
      const stLat = geom?.lat ?? (typeof r.latitude === 'number' ? r.latitude / 100000 : 0)
      const stLon = geom?.lon ?? (typeof r.longitude === 'number' ? r.longitude / 100000 : 0)

      const fuels = FUEL_COLS
        .filter(f => r[f.col] != null)
        .map(f => ({
          name: f.name,
          price: parseFloat(String(r[f.col])),
          updated: (r[f.maj] as string) ?? null,
        }))

      return {
        id: String(r.id),
        name: (r.nom_station as string) ?? '',
        address: [r.adresse, r.ville].filter(Boolean).join(', '),
        city: (r.ville as string) ?? '',
        lat: stLat,
        lon: stLon,
        brand: (r.enseignes as string) ?? '',
        fuels,
      }
    }).filter(s => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0)

    return NextResponse.json({ stations })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
