/**
 * seed-brands.mjs
 * Script one-shot : enrichit station_brands dans Supabase
 * avec les marques OSM croisées avec les IDs gov.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-brands.mjs
 *
 * Durée estimée : 2-3 min (Overpass ~30s + matching + upsert)
 */

import { createClient } from '@supabase/supabase-js'
import { createWriteStream, existsSync } from 'fs'
import { readFile, unlink } from 'fs/promises'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { XMLParser } from 'fast-xml-parser'
import https from 'https'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── 1. Download gov XML feed ──────────────────────────────────────────────────
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    https.get(url, res => {
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
  })
}

async function fetchGovStations() {
  console.log('📥 Downloading gov XML feed (instantane)...')
  const zipPath = '/tmp/stations.zip'

  await downloadFile('https://donnees.roulez-eco.fr/opendata/instantane', zipPath)

  // Unzip
  const { execSync } = await import('child_process')
  execSync(`cd /tmp && unzip -o stations.zip -d stations_xml 2>/dev/null || true`)

  // Find XML file
  const { readdirSync } = await import('fs')
  const files = readdirSync('/tmp/stations_xml')
  const xmlFile = files.find(f => f.endsWith('.xml'))
  if (!xmlFile) throw new Error('No XML file found in zip')

  console.log(`📄 Parsing ${xmlFile}...`)
  const xml = await readFile(`/tmp/stations_xml/${xmlFile}`, 'latin1')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['pdv', 'prix', 'service', 'horaire', 'jour'].includes(name),
  })
  const result = parser.parse(xml)
  const stations = result?.pdv_liste?.pdv ?? []
  console.log(`✅ Found ${stations.length} gov stations`)
  return stations
}

// ── 2. Fetch all fuel stations from Overpass France ───────────────────────────
async function fetchOverpassFrance() {
  console.log('🌍 Querying Overpass for all fuel stations in France...')
  const query = `[out:json][timeout:60];
(
  node["amenity"="fuel"]["brand"](47,-5,51,10);
  node["amenity"="fuel"]["operator"](47,-5,51,10);
  node["amenity"="fuel"]["name"](47,-5,51,10);
  way["amenity"="fuel"]["brand"](47,-5,51,10);
  way["amenity"="fuel"]["operator"](47,-5,51,10);
);
out center tags;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(90000),
  })

  if (!res.ok) throw new Error(`Overpass error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const elements = data.elements ?? []
  console.log(`✅ Found ${elements.length} OSM fuel stations`)

  return elements.map(el => ({
    lat: el.lat ?? el.center?.lat ?? 0,
    lon: el.lon ?? el.center?.lon ?? 0,
    brand: normalizeBrand(el.tags?.brand ?? el.tags?.operator ?? el.tags?.name ?? ''),
    osm_name: el.tags?.name ?? el.tags?.brand ?? '',
    ref: el.tags?.['ref:FR:prix-carburants'] ?? '',
  })).filter(s => s.lat !== 0 && s.brand)
}

// ── 3. Normalize brand names ──────────────────────────────────────────────────
function normalizeBrand(raw) {
  if (!raw) return ''
  const s = raw.toLowerCase().trim()
  if (/intermarché|intermarche/.test(s)) return 'Intermarché'
  if (/carrefour/.test(s)) return 'Carrefour'
  if (/e\.?\s*leclerc|leclerc/.test(s)) return 'E.Leclerc'
  if (/totalenergies|total access|total\b/.test(s)) return 'TotalEnergies'
  if (/\bbp\b/.test(s)) return 'BP'
  if (/shell/.test(s)) return 'Shell'
  if (/esso/.test(s)) return 'Esso'
  if (/auchan/.test(s)) return 'Auchan'
  if (/super\s*u\b/.test(s)) return 'Super U'
  if (/\bcasino\b/.test(s)) return 'Casino'
  if (/\bnetto\b/.test(s)) return 'Netto'
  if (/\bavia\b/.test(s)) return 'Avia'
  if (/dyneff/.test(s)) return 'Dyneff'
  if (/\bq8\b/.test(s)) return 'Q8'
  if (/pétrole de la manche|p\.e\.m\b|pem\b/.test(s)) return 'PEM'
  if (/système u|systeme u/.test(s)) return 'Super U'
  // Keep as-is if reasonable brand name
  if (raw.length >= 2 && raw.length <= 40) {
    return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  return ''
}

// ── 4. Haversine distance ─────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── 5. Main ───────────────────────────────────────────────────────────────────
async function main() {
  const [govStations, osmStations] = await Promise.all([
    fetchGovStations(),
    fetchOverpassFrance(),
  ])

  console.log('🔗 Matching gov stations with OSM brands...')

  // Build spatial index: bucket OSM stations by ~0.1° grid cell for fast lookup
  const osmIndex = new Map()
  for (const osm of osmStations) {
    // Also index by ref if available
    if (osm.ref) {
      osmIndex.set(`ref:${osm.ref}`, osm)
    }
    const key = `${Math.round(osm.lat * 10)},${Math.round(osm.lon * 10)}`
    if (!osmIndex.has(key)) osmIndex.set(key, [])
    osmIndex.get(key).push(osm)
  }

  const rows = []
  let matched = 0

  for (const station of govStations) {
    const id = String(station['@_id'])
    const lat = parseFloat(station['@_latitude']) / 100000
    const lon = parseFloat(station['@_longitude']) / 100000
    if (!lat || !lon) continue

    // Try ref match first
    const refMatch = osmIndex.get(`ref:${id}`)
    if (refMatch) {
      rows.push({ id, brand: refMatch.brand, osm_name: refMatch.osm_name, lat, lon })
      matched++
      continue
    }

    // Spatial match: check nearby grid cells
    let bestBrand = ''
    let bestName = ''
    let bestDist = 150 // max 150m

    const gridLat = Math.round(lat * 10)
    const gridLon = Math.round(lon * 10)

    for (let dlat = -1; dlat <= 1; dlat++) {
      for (let dlon = -1; dlon <= 1; dlon++) {
        const candidates = osmIndex.get(`${gridLat + dlat},${gridLon + dlon}`) ?? []
        for (const osm of candidates) {
          const d = haversine(lat, lon, osm.lat, osm.lon)
          if (d < bestDist) {
            bestDist = d
            bestBrand = osm.brand
            bestName = osm.osm_name
          }
        }
      }
    }

    rows.push({ id, brand: bestBrand, osm_name: bestName, lat, lon })
    if (bestBrand) matched++
  }

  console.log(`✅ Matched ${matched}/${govStations.length} stations with a brand`)

  // ── 6. Upsert into Supabase ──────────────────────────────────────────────
  console.log('💾 Upserting into Supabase...')
  const CHUNK = 500
  let total = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('station_brands')
      .upsert(chunk, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Upsert error at chunk ${i}:`, error)
    } else {
      total += chunk.length
      process.stdout.write(`\r  ${total}/${rows.length} rows...`)
    }
  }

  console.log(`\n✅ Done! ${total} rows upserted.`)

  // Stats
  const { data: stats } = await supabase
    .from('station_brands')
    .select('brand')
    .neq('brand', '')
  console.log(`📊 Stations with brand: ${stats?.length ?? 0}`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
