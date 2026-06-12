import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  // Test Overpass
  try {
    const query = `[out:json][timeout:5];node["amenity"="fuel"](around:500,48.8566,2.3522);out tags;`
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(6000),
    })
    const text = await r.text()
    results.overpass = { status: r.status, body_start: text.slice(0, 200) }
  } catch (e) { results.overpass = { error: String(e) } }

  // Test Nominatim
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=48.835&lon=2.358&format=json', {
      headers: { 'User-Agent': 'PrixPompe/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const text = await r.text()
    results.nominatim = { status: r.status, body_start: text.slice(0, 200) }
  } catch (e) { results.nominatim = { error: String(e) } }

  // Test api-adresse.data.gouv.fr
  try {
    const r = await fetch('https://api-adresse.data.gouv.fr/search/?q=114+BD+DE+L+HOPITAL+Paris&limit=1', {
      signal: AbortSignal.timeout(5000),
    })
    const text = await r.text()
    results.adresse_gouv = { status: r.status, body_start: text.slice(0, 200) }
  } catch (e) { results.adresse_gouv = { error: String(e) } }

  return NextResponse.json(results)
}
