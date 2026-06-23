# CLAUDE.md

Hlavný kontext pre AI asistentov pracujúcich s týmto projektom. Začni tu.

## Čo je tento projekt

**Appka-dodavatelia** — katalóg overených dodávateľov a výrobcov textilu v regióne SK / CZ / PL. Cieľová skupina: módni dizajnéri, malé značky a výrobcovia, ktorí potrebujú nájsť spoľahlivý zdroj látok podľa konkrétnych parametrov (materiál, gramáž, MOQ, certifikáty).

Postavené na **scrapingu (Apify) → ingest pipeline → admin review → verejný katalóg s filtrami**.

## Stack

| Vrstva     | Technológia                                    |
| ---------- | ---------------------------------------------- |
| Zber dát   | Apify Actors (Google Maps Scraper, web scrapery) |
| Príjem dát | Next.js Route Handler (`/api/ingest/apify`)    |
| Databáza   | Supabase (Postgres + Auth + RLS)               |
| Aplikácia  | Next.js 14 App Router (Vercel)                 |
| Plánovač   | Apify scheduler → webhook do ingest endpointu  |

## Hlavné rozhodnutia (lock-in)

1. **Admin review krok je povinný** — scraping prinesie 20–40 % šumu (duplicity, nesúvisiace firmy, neaktuálne kontakty). Bez review by sa katalóg rýchlo stal nedôveryhodným.
2. **V Phase 1 je appka interná** — Supabase Auth s jedným adminom, verejnosť má read-only prístup k publikovaným záznamom cez RLS. Verejná registrácia značiek/dizajnérov príde až v Phase 3.
3. **Spúšťanie scrapingu cez Apify scheduler** — nie cez Vercel Cron. Vercel Cron sa použije len na úlohy *vo vnútri* appky (nočné prečistenie duplicít, refresh slugov…).
4. **Dedup primárny kľúč = doména webu**. Fallback je manuálny merge v admin review.
5. **`suppliers` a `fabrics` sú oddelené tabuľky** — scraping spoľahlivo dá kontakt + kategóriu, ale detaily látok (gramáž, zloženie, MOQ, certifikáty) sa získavajú postupne / poloautomaticky pri review.

## Štruktúra projektu

```
app/
├─ page.tsx                       # verejný zoznam + filtre (Server Component)
├─ supplier/[slug]/page.tsx       # detail dodávateľa + jeho látky
├─ admin/
│  ├─ page.tsx                    # review fronta (server actions: publish/reject)
│  └─ login/page.tsx              # magic-link prihlásenie
├─ auth/callback/route.ts         # výmena code → session
└─ api/ingest/apify/route.ts      # webhook z Apify

lib/
├─ supabase/server.ts             # SSR klient (RLS aware)
├─ supabase/admin.ts              # service-role klient (LEN server-side)
└─ normalize.ts                   # normalizácia Apify itemov → suppliers row

supabase/
└─ migrations/0001_init.sql       # schéma + indexy + RLS politiky

middleware.ts                     # refresh Supabase session cookie pre /admin
```

## Detailné dokumenty

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — dátový tok, schéma, dizajn rozhodnutia
- [`docs/DATABASE.md`](./docs/DATABASE.md) — DB schéma, indexy, RLS politiky
- [`docs/SETUP.md`](./docs/SETUP.md) — lokálny + produkčný setup (Supabase, Vercel, env)
- [`docs/INGEST.md`](./docs/INGEST.md) — Apify konfigurácia, webhook payload, dedup logika
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — stav fáz, čo je hotové, čo nasleduje

## Pravidlá pre AI asistenta

- **Pred zmenami v `app/page.tsx`** prečítaj `docs/ARCHITECTURE.md` (sekciu *Filtre*) — filtre bežia server-side, nie cez client state.
- **Pred zmenami v schéme DB** vytvor novú migráciu (`supabase/migrations/000N_…sql`), nikdy needituj existujúce migrácie ktoré už boli aplikované v produkcii.
- **Service-role klient (`lib/supabase/admin.ts`) sa NIKDY neimportuje do client komponentu** — obchádza RLS a smie bežať len server-side (route handlers, server components, server actions).
- **Pri ingest pipeline** — ak meníš `lib/normalize.ts`, kontroluj, že stĺpec `website` ostáva čistá doména (bez `https://`, bez `www.`) lebo je to dedup kľúč.
- **Texty UI v slovenčine.** Identifikátory (názvy stĺpcov, slugy, kódy materiálov) v angličtine.

## Bežné úlohy

| Úloha                                | Štartovací súbor                              |
| ------------------------------------ | --------------------------------------------- |
| Pridať nový filter do zoznamu        | `app/page.tsx` (Server Component + form)      |
| Pridať nový zdroj scrapingu          | `lib/normalize.ts` (rozšíriť `pickString` kľúče) |
| Zmena schémy DB                      | nová migrácia v `supabase/migrations/`         |
| Pridať admin akciu                   | `app/admin/page.tsx` (server action + form)   |
| Pridať pole na detail dodávateľa     | `app/supplier/[slug]/page.tsx`                |
