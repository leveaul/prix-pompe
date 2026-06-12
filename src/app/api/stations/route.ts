import { NextRequest, NextResponse } from 'next/server'

const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const fuel = searchParams.get('fuel') || ''
  const radius = searchParams.get('radius') || '5000'

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })
  }

  try {
    const distanceFilter = `distance(geom, geom'POINT(${lon} ${lat})', ${radius}m)`
    const fuelFilter = fuel ? ` AND carburant_nom="${fuel}"` : ''
    const where = distanceFilter + fuelFilter

    const url = new URL(FUEL_API)
    url.searchParams.set('where', where)
    url.searchParams.set('limit', '100')
    url.searchParams.set('order_by', `distance(geom, geom'POINT(${lon} ${lat})')`)

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('API error:', res.status, errText)
      return NextResponse.json({ error: `Upstream error ${res.status}`, detail: errText }, { status: 502 })
    }

    const data = await res.json()

    // Inspect first record to understand field names
    if (data.results?.length > 0) {
      console.log('First record keys:', Object.keys(data.results[0]))
      console.log('First record sample:', JSON.stringify(data.results[0]).slice(0, 500))
    }

    // Group by station id to merge fuel types
    const stationsMap = new Map<string, Station>()

    for (const record of data.results ?? []) {
      // The API returns one row per fuel type per station
      const id = String(record.id)

      if (!stationsMap.has(id)) {
        // Try multiple possible coord field names
        let lat_val: number | null = null
        let lon_val: number | null = null

        if (record.geom) {
          lat_val = record.geom.lat ?? record.geom.latitude ?? null
          lon_val = record.geom.lon ?? record.geom.longitude ?? null
        }
        if (!lat_val && record.latitude) {
          // API returns coordinates * 100000 in some versions
          lat_val = Math.abs(record.latitude) > 90 ? record.latitude / 100000 : record.latitude
        }
        if (!lon_val && record.longitude) {
          lon_val = Math.abs(record.longitude) > 180 ? record.longitude / 100000 : record.longitude
        }

        stationsMap.set(id, {
          id,
          name: record.nom_station ?? record.enseignes ?? '',
          address: [record.adresse, record.ville].filter(Boolean).join(', '),
          city: record.ville ?? '',
          lat: lat_val ?? 0,
          lon: lon_val ?? 0,
          fuels: [],
          brand: record.enseignes ?? '',
          updated: record.carburant_maj ?? null,
        })
      }

      const station = stationsMap.get(id)!
      const fuelName = record.carburant_nom
      const fuelPrice = record.carburant_prix

      if (fuelName && fuelPrice != null) {
        const existing = station.fuels.find(f => f.name === fuelName)
        if (!existing) {
          station.fuels.push({
            name: fuelName,
            price: parseFloat(String(fuelPrice)),
            updated: record.carburant_maj ?? null,
          })
        }
      }
    }

    const stations = Array.from(stationsMap.values()).filter(
      s => s.lat !== 0 && s.lon !== 0 && s.fuels.length > 0
    )

    return NextResponse.json({
      stations,
      debug: {
        total_raw: data.results?.length ?? 0,
        total_count: data.total_count,
        after_filter: stations.length,
      }
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (err) {
    console.error('Station fetch error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

interface Fuel {
  name: string
  price: number
  updated: string | null
}

interface Station {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lon: number
  fuels: Fuel[]
  brand: string
  updated: string | null
}
