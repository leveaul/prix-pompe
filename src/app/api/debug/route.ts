import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?where=distance(geom,geom\'POINT(2.3522 48.8566)\',5000m)&limit=2'
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  const first = data.results?.[0] ?? null
  return NextResponse.json({
    total_count: data.total_count,
    first_record: first,
    first_keys: first ? Object.keys(first) : [],
  })
}
