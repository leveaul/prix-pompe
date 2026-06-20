import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) return null
  return createClient(url, key)
}

async function fetchBrandsFromSupabase(ids: string[]): Promise<Record<string, string>> {
  const supabase = getSupabase()
  if (!supabase || ids.length === 0) return {}

  const { data, error } = await supabase
    .from('station_brands')
    .select('id, brand')
    .in('id', ids)
    .neq('brand', '')

  if (error) { console.error('Supabase error:', error); return {} }
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.id] = row.brand
  return map
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
    // Plus le rayon est grand, plus on autorise de résultats (jusqu'à 300)
    const limit = radius >= 100000 ? 300 : radius >= 50000 ? 200 : 100
    govUrl.searchParams.set('limit', String(limit))
    govUrl.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const govRes = await fetch(govUrl.toString(), { cache: 'no-store' })
    if (!govRes.ok) return NextResponse.json({ error: `Upstream ${govRes.status}` }, { status: 502 })
    const govData = await govRes.json()
    const raw: Record<string, unknown>[] = govData.results ?? []

    // Fetch brands from Supabase in one query
    const ids = raw.map(r => String(r.id))
    const brandMap = await fetchBrandsFromSupabase(ids)

    const stations = raw.map(r => {
      const geom = r.geom as { lat?: number; lon?: number } | null
      const stLat = geom?.lat ?? 0
      const stLon = geom?.lon ?? 0
      const brand = brandMap[String(r.id)] ?? ''

      const fuels = FUEL_COLS
        .filter(f => r[f.col] != null)
        .map(f => ({ name: f.name, price: parseFloat(String(r[f.col])), updated: (r[f.maj] as string) ?? null }))

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
    }).filter(s => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0)

    return NextResponse.json({ stations })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
