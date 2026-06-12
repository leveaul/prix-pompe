import { NextRequest, NextResponse } from 'next/server'

const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

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

    const params = new URLSearchParams({
      where,
      limit: '100',
      order_by: `distance(geom, geom'POINT(${lon} ${lat})')`,
    })

    const res = await fetch(`${FUEL_API}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })

    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()

    // Group by station id to merge fuel types
    const stationsMap = new Map<string, Station>()

    for (const record of data.results ?? []) {
      const id = record.id
      if (!stationsMap.has(id)) {
        stationsMap.set(id, {
          id,
          name: record.nom_station ?? record.enseignes ?? 'Station',
          address: `${record.adresse ?? ''}, ${record.ville ?? ''}`.trim().replace(/^,\s*/, ''),
          city: record.ville ?? '',
          lat: record.latitude ? record.latitude / 100000 : record.geom?.lat,
          lon: record.longitude ? record.longitude / 100000 : record.geom?.lon,
          fuels: [],
          services: record.services_service ?? [],
          brand: record.enseignes ?? '',
          updated: record.carburant_maj ?? null,
        })
      }

      const station = stationsMap.get(id)!
      if (record.carburant_nom && record.carburant_prix) {
        const existing = station.fuels.find(f => f.name === record.carburant_nom)
        if (!existing) {
          station.fuels.push({
            name: record.carburant_nom,
            price: parseFloat(record.carburant_prix),
            updated: record.carburant_maj ?? null,
          })
        }
      }
    }

    const stations = Array.from(stationsMap.values()).filter(
      s => s.lat && s.lon && s.fuels.length > 0
    )

    return NextResponse.json({ stations })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch fuel data' }, { status: 500 })
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
  services: string[]
  brand: string
  updated: string | null
}
