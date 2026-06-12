# Scripts

## seed-brands.mjs

Peuple la table `station_brands` dans Supabase avec les marques OSM.

### Usage

```bash
# 1. Récupère la service key dans Supabase > Settings > API
# 2. Lance le script :
SUPABASE_URL=https://qgdcutklhgnlcrxuvgkn.supabase.co \
SUPABASE_SERVICE_KEY=<ta_service_key> \
node scripts/seed-brands.mjs
```

### Durée estimée
- Download XML gov : ~10s
- Overpass France : ~30-60s  
- Matching + upsert : ~30s
- **Total : ~2-3 min**

### Relancer
Le script est idempotent (upsert). Relance-le quand tu veux rafraîchir.
