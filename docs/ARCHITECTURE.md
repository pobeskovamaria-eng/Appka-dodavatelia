# Architektúra

## Vysokoúrovňový obrázok

```
┌──────────────┐    cron     ┌───────────────┐    webhook    ┌──────────────────────┐
│   Apify      │ ──────────► │ Apify Actor   │ ───────────►  │  Next.js (Vercel)    │
│  scheduler   │             │ (scraper)     │  ACTOR.RUN.   │  /api/ingest/apify   │
└──────────────┘             └───────┬───────┘  SUCCEEDED    └──────────┬───────────┘
                                     │                                  │
                                     │ stiahnutie datasetu              │ normalizácia
                                     │ cez Apify API                    │ + dedup + upsert
                                     │                                  ▼
                                     │                       ┌──────────────────────┐
                                     │                       │  Supabase Postgres   │
                                     │                       │  (suppliers/fabrics) │
                                     │                       └──────────┬───────────┘
                                     │                                  │
                                     │                          RLS: published-only
                                     │                                  │
                                     │                                  ▼
                                     │                       ┌──────────────────────┐
                                     │                       │  Next.js Server      │
                                     │                       │  Components (SSR)    │
                                     │                       │  /  +  /supplier/*   │
                                     │                       └──────────────────────┘
                                     │
                                     │                       ┌──────────────────────┐
                                     └──────────────────────►│  Admin /admin        │
                                                   manuálne  │  (Supabase Auth)     │
                                                   review    │  publish / reject    │
                                                             └──────────────────────┘
```

## Dátový tok (ingest pipeline)

1. **Apify scheduler** spustí Actor (napr. Google Maps Scraper) podľa preddefinovaného harmonogramu (napr. raz týždenne).
2. Po úspešnom dobehnutí Apify pošle webhook `ACTOR.RUN.SUCCEEDED` na `POST /api/ingest/apify?secret=…`. Payload obsahuje `resource.defaultDatasetId`.
3. Route handler:
   - overí `secret` query parameter proti `APIFY_WEBHOOK_SECRET`,
   - stiahne dataset cez Apify API (`/v2/datasets/:id/items?clean=true`),
   - každý item prejde cez `normalizeSupplier()` v `lib/normalize.ts`,
   - **deduplikuje** záznamy s vyplneným `website` cez `UPSERT … ON CONFLICT (website)`,
   - záznamy bez webu vloží ako nové (manuálny dedup v review),
   - všetky nové záznamy majú `status='new'`.
4. **Admin** v `/admin` prejde fronu `status='new'`, jedným klikom záznam *Publikuje* alebo *Zamietne*. Iba `status='published'` je viditeľné verejne (vynucuje RLS).

## Frontend dizajn

- **Server Components** sú default. Filtre v `app/page.tsx` sú v `<form method="get">` — stav je v URL query params, je shareable a SEO-friendly.
- **Žiadny ťažký JS na klientovi** v Phase 1. Iba `app/admin/login/page.tsx` je client component (potrebuje `signInWithOtp` z prehliadača).
- **`force-dynamic`** na zoznamovej stránke a admin stránke — chceme čerstvé dáta. Detail dodávateľa môže byť cachovaný v ďalšej fáze.

## Bezpečnosť

| Riziko                              | Mitigácia                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| Fake POST na ingest endpoint        | `APIFY_WEBHOOK_SECRET` v query parametri, porovnanie konštantným časom        |
| Únik service-role kľúča             | `SUPABASE_SERVICE_ROLE_KEY` nie je `NEXT_PUBLIC_*`, použitý len server-side   |
| Verejný únik nepublikovaných záznamov | RLS politika `using (status = 'published')` na `suppliers` a `fabrics`       |
| Neoprávnená admin akcia             | Server action volá `supabase.auth.getUser()`, presmeruje na login bez session |
| Otrava DB cez Apify dataset         | Normalizácia odmieta záznamy bez `name`; admin review pred publikáciou        |

## Prečo Supabase, nie vlastný Postgres

- Auth + RLS + Storage v jednom — netreba samostatný auth server.
- Postgres je plnohodnotný, takže neskôr môžeme bez migrácie pridať full-text search (`pg_trgm`, `tsvector`), JSONB filtre, alebo PostGIS pre geo-filtre.
- Free tier stačí na Phase 1 (do ~500 MB DB, neobmedzený auth).

## Prečo Next.js App Router, nie SvelteKit / Astro

- Server Components dovolia napísať filtre bez `useState/useEffect` boilerplate a bez klientskeho JS.
- Vercel deploy je 0-config.
- Tím (a AI asistenti) majú s Next.js najviac kontextu.
