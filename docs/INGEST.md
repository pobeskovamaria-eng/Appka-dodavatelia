# Ingest pipeline (Apify → Supabase)

## Konfigurácia Apify Actoru

**Odporúčaný Actor pre Phase 1:** [Google Maps Scraper](https://apify.com/compass/crawler-google-places).

### Vstupné parametre (Input)

```json
{
  "searchStringsArray": [
    "výroba látok",
    "veľkoobchod textilu",
    "fabric manufacturer",
    "fabric wholesale",
    "textile mill"
  ],
  "locationQuery": "Slovakia",
  "maxCrawledPlacesPerSearch": 100,
  "language": "sk",
  "exportPlaceUrls": true,
  "scrapeContacts": true
}
```

Pre Česko a Poľsko spusti samostatné runy s `locationQuery: "Czechia"` / `"Poland"` — pomáha to s reportovaním a quotou.

### Webhook (Apify Console)

**Actor → Integrations → Webhooks → Add webhook:**

| pole              | hodnota                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| Event types       | `ACTOR.RUN.SUCCEEDED`                                                              |
| Request URL       | `https://<domena>/api/ingest/apify?secret=<APIFY_WEBHOOK_SECRET>`                  |
| Payload template  | *default* (musí obsahovať `resource.defaultDatasetId`)                             |

### Scheduler (Apify Console)

**Schedules → Create new:**
- Cron: `0 3 * * 1` (každý pondelok 03:00 UTC)
- Action: `Run Actor` → vyber svoj Actor s tvojím input setom

## Ingest endpoint

**`POST /api/ingest/apify?secret=…`**

**Vstup (zjednodušene):**
```json
{
  "resource": { "defaultDatasetId": "abc123XYZ" },
  "source": "apify_gmaps"  // voliteľné, default je apify_gmaps
}
```

**Spracovanie:**
1. Overenie `secret` query parameter proti `APIFY_WEBHOOK_SECRET` (401 ak nesedí).
2. Fetch `https://api.apify.com/v2/datasets/<id>/items?clean=true&format=json&token=<APIFY_TOKEN>`.
3. Pre každý item: `normalizeSupplier(item, source)` v `lib/normalize.ts`.
4. Záznamy s `website` → `upsert … on conflict (website)`.
5. Záznamy bez webu → `insert` (manuálny dedup pri review).
6. Všetky nové záznamy: `status = 'new'`.

**Výstup:**
```json
{
  "ok": true,
  "received": 87,      // koľko itemov prišlo z Apify
  "normalized": 73,    // koľko prešlo normalizáciou
  "upserted": 65,      // koľko sa upsertlo cez website
  "inserted": 8        // koľko sa vložilo bez webu
}
```

## Normalizácia (`lib/normalize.ts`)

| transformácia               | logika                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `name`                      | trim, povinné — záznam bez `name` sa zahodí                         |
| `website`                   | parse URL → hostname → `www.` strip → lowercase                     |
| `country`                   | mapping cez `COUNTRY_MAP` (Slovakia → SK, …) alebo ISO ak už ISO     |
| `slug`                      | `slugify(name)` → lowercase, diakritika strip, `[^a-z0-9]+` → `-`   |
| `raw`                       | originálny payload uložený do JSONB (audit, re-parse)               |

**Pridanie nového zdroja:**
- Najjednoduchšie: rozšír kľúče v `pickString()` v `lib/normalize.ts` (napr. ak iný scraper používa `companyName` namiesto `title`).
- Vytvor nový `source` tag (napr. `apify_b2b_katalog`).
- Pre úplne odlišnú schému payloadu vytvor samostatný `normalizeSupplierFromX()` a route handler `/api/ingest/x`.

## Dedup stratégia

| situácia                          | správanie                                                  |
| --------------------------------- | ---------------------------------------------------------- |
| existujúci `website`              | upsert prepíše ostatné polia novými hodnotami z Apify     |
| nový `website`                    | insert                                                    |
| chýba `website`                   | insert; admin manuálne merge cez SQL alebo nový UI krok    |
| duplicitný `slug` (rovnaký názov) | DB vráti chybu — riešiť: rename v admin review            |

**Možné vylepšenia (Phase 1.5):**
- Fuzzy dedup cez `pg_trgm` similarity (`name` + `city` + `country`).
- UI tlačidlo *Zlúčiť s existujúcim* v admin review.
- Hash `name|city` ako sekundárny dedup kľúč pre záznamy bez webu.

## Manuálny test

```bash
# 1) Spusti Actor v Apify Console, počkaj na úspech, skopíruj Dataset ID
# 2) Zavolaj ingest manuálne:

curl -X POST "https://<domena>/api/ingest/apify?secret=$APIFY_WEBHOOK_SECRET" \
  -H "content-type: application/json" \
  -d '{"resource":{"defaultDatasetId":"<DATASET_ID>"}}'
```

Alebo lokálne s tvojím dev serverom:
```bash
curl -X POST "http://localhost:3000/api/ingest/apify?secret=$APIFY_WEBHOOK_SECRET" \
  -H "content-type: application/json" \
  -d '{"resource":{"defaultDatasetId":"<DATASET_ID>"}}'
```

## Monitoring

V Phase 1 sa spolieha na:
- **Apify Console** — história runov + chyby Actora.
- **Vercel Logs** (`/api/ingest/apify`) — výstup ingest endpointu.
- **Supabase Logs** — DB chyby (constraints, RLS denials).

V Phase 2 zvážiť: jednoduchá `ingest_runs` tabuľka s `started_at`, `finished_at`, `items_received`, `items_inserted`, `errors[]`.
