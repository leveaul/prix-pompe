import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  const url = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?where=distance(geom,geom'POINT(2.3522 48.8566)',5000m)&limit=3"
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  // Return ALL fields of first 3 records
  return NextResponse.json({ records: data.results?.map((r: Record<string, unknown>) => ({ ...r })) ?? [] })
}
