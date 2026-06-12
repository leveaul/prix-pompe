import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  // Test Overpass with ref:FR:prix-carburants
  try {
    const query = `[out:json][timeout:8];node["amenity"="fuel"]["ref:FR:prix-carburants"~"75013"](around:10000,48.8566,2.3522);out tags;`
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(9000),
    })
    const text = await r.text()
    results.overpass_ref = { status: r.status, length: text.length, start: text.slice(0, 400) }
  } catch (e) { results.overpass_ref = { error: String(e) } }

  // Test roulez-eco XML feed (has station names)
  try {
    const r = await fetch('https://donnees.roulez-eco.fr/opendata/instantane', {
      signal: AbortSignal.timeout(8000),
    })
    results.roulez_eco = { status: r.status, content_type: r.headers.get('content-type'), size: r.headers.get('content-length') }
  } catch (e) { results.roulez_eco = { error: String(e) } }

  return NextResponse.json(results)
}
