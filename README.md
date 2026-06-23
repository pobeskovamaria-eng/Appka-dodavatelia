# Appka-dodavatelia

Katalóg dodávateľov a výrobcov textilu (SK / CZ / PL). Phase 1 — interný nástroj s admin review fronta, scraping cez Apify, dáta v Supabase, frontend Next.js (Vercel).

## Stack

| Vrstva       | Technológia                                  |
| ------------ | -------------------------------------------- |
| Zber dát     | Apify Actors (Google Maps + web scrapery)    |
| Príjem dát   | `app/api/ingest/apify/route.ts` (Next.js)    |
| Databáza     | Supabase (Postgres + Auth + RLS)             |
| Aplikácia    | Next.js 14 App Router (Vercel)               |
| Plánovač     | Apify scheduler → webhook do ingest endpointu |

## Lokálny setup

1. `cp .env.example .env.local` a vyplň všetky kľúče.
2. V Supabase projekte spusti `supabase/migrations/0001_init.sql` (SQL editor alebo `supabase db push`).
3. `npm install`
4. `npm run dev` → `http://localhost:3000`

## Admin (review fronta)

- `/admin/login` — magic-link prihlásenie cez Supabase Auth.
- V Supabase **Authentication → URL Configuration** pridaj redirect URL:
  - `http://localhost:3000/auth/callback`
  - `https://<tvoja-prod-domena>/auth/callback`
- Prístup obmedz cez Supabase Auth (na začiatku stačí jeden používateľ — ty).

## Apify → ingest

1. V Apify vytvor Actor run (napr. *Google Maps Scraper*) s kľúčovými slovami `výroba látok`, `veľkoobchod textilu`, `fabric manufacturer`, krajiny SK/CZ/PL.
2. V **Settings → Integrations → Webhooks** Actoru pridaj webhook:
   - **Event types**: `ACTOR.RUN.SUCCEEDED`
   - **URL**: `https://<tvoja-domena>/api/ingest/apify?secret=<APIFY_WEBHOOK_SECRET>`
   - **Payload template**: nechaj default (obsahuje `resource.defaultDatasetId`).
3. Spusti Actor → ingest endpoint stiahne dataset, normalizuje, deduplikuje podľa domény webu a zapíše ako `status='new'`.
4. V `/admin` schváliš relevantné firmy → `status='published'`.

### Manuálny test ingestu

```bash
curl -X POST "http://localhost:3000/api/ingest/apify?secret=<APIFY_WEBHOOK_SECRET>" \
  -H "content-type: application/json" \
  -d '{"resource":{"defaultDatasetId":"<DATASET_ID>"}}'
```

## Schéma DB (zhrnutie)

- `suppliers` — kontakty + status (`new` / `published` / `rejected`), dedup cez unikátnu doménu `website`.
- `fabrics` — detail ponuky látok (gramáž, MOQ, certifikáty…), naviazané na `supplier_id`.
- `material_types` — číselník pre konzistentné filtre.

RLS: anon vidí len `suppliers.status = 'published'` a ich `fabrics`. Admin operácie idú cez service-role v server-side route handleroch.

## Roadmap (next phases)

- Phase 2: Plné napĺňanie `fabrics` (gramáž, zloženie, MOQ, certifikáty) — kombinácia web scrapingu a manuálnej kurátorky pri review.
- Phase 3: Verejná registrácia značiek/dizajnérov, uložené hľadania, kontaktné formuláre.
- Phase 4: Rozšírenie regiónu (DE, IT, PT) a ďalšie typy materiálov.
