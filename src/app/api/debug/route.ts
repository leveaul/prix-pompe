import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

  // Get dataset schema/fields
  const schemaUrl = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2'
  const schemaRes = await fetch(schemaUrl)
  const schemaText = await schemaRes.text()

  // Try distance with small radius (worked before)
  const url1 = new URL(FUEL_API)
  url1.searchParams.set('where', `distance(geom, geom'POINT(8.74 41.95)', 30000m)`)
  url1.searchParams.set('limit', '5')
  const res1 = await fetch(url1.toString())
  const text1 = await res1.text()

  // Try distance with 100km
  const url2 = new URL(FUEL_API)
  url2.searchParams.set('where', `distance(geom, geom'POINT(8.74 41.95)', 100000m)`)
  url2.searchParams.set('limit', '5')
  const res2 = await fetch(url2.toString())
  const text2 = await res2.text()

  return NextResponse.json({
    schema_fields: schemaText.slice(0, 2000),
    distance_30km: { status: res1.status, body: text1.slice(0, 500) },
    distance_100km: { status: res2.status, body: text2.slice(0, 500) },
  })
}
