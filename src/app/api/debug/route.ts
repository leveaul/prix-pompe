import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const FUEL_API = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'

  // Test 1: simple bbox
  const url1 = new URL(FUEL_API)
  url1.searchParams.set('where', 'latitude>=4100000 AND latitude<=4300000 AND longitude>=800000 AND longitude<=950000')
  url1.searchParams.set('limit', '5')
  const res1 = await fetch(url1.toString())
  const text1 = await res1.text()

  // Test 2: decimal degrees directly
  const url2 = new URL(FUEL_API)
  url2.searchParams.set('where', 'latitude>=41.0 AND latitude<=43.0')
  url2.searchParams.set('limit', '5')
  const res2 = await fetch(url2.toString())
  const text2 = await res2.text()

  // Test 3: just get raw record to see field format
  const url3 = new URL(FUEL_API)
  url3.searchParams.set('limit', '1')
  const res3 = await fetch(url3.toString())
  const text3 = await res3.text()

  return NextResponse.json({
    test1_int_bbox: { status: res1.status, body: text1.slice(0, 400) },
    test2_decimal: { status: res2.status, body: text2.slice(0, 400) },
    test3_raw_record: { status: res3.status, body: text3.slice(0, 800) },
  })
}
