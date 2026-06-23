# Roadmap

## Phase 1 — interný katalóg s admin review *(HOTOVÉ)*

Cieľ: dostať do DB prvých 200–500 dodávateľov z SK/CZ/PL a mať ich filterovateľných cez verejné UI.

- [x] Next.js 14 App Router + Tailwind scaffold
- [x] Supabase schéma (`suppliers`, `fabrics`, `material_types`) + indexy + RLS
- [x] Apify webhook ingest endpoint (secret guard, normalize, dedup, upsert)
- [x] Admin review fronta (Supabase Auth magic link, publish/reject)
- [x] Verejný zoznam + filtre (krajina, materiál, certifikát, fulltext name)
- [x] Detail dodávateľa (`/supplier/[slug]`)
- [x] Dokumentácia (`docs/`, `CLAUDE.md`)

**Čo treba urobiť mimo kódu pred prvým runom:**
- [ ] Vytvoriť Supabase projekt + spustiť `0001_init.sql`
- [ ] Vytvoriť Apify Actor + scheduler + webhook
- [ ] Deploy na Vercel + nastaviť env vars
- [ ] Prejsť prvú review fronu (~hodina práce na 200 firiem)

## Phase 1.5 — kvalita dát *(odporúčaný ďalší krok)*

Cieľ: detaily ponuky látok a menej duplicit.

- [ ] **Editácia `fabrics` v admin review** — pri schvaľovaní pridať formulár na vyplnenie gramáže, MOQ, certifikátov, materiálu.
- [ ] **Fuzzy dedup** — `pg_trgm` similarity nad `name + city`; v review zobraziť „možný duplikát z X".
- [ ] **UI Zlúčiť dodávateľov** — admin akcia ktorá zmerguje `fabrics` z duplicitných záznamov a oznací duplikát ako `rejected`.
- [ ] **Logo upload** — Supabase Storage bucket `supplier-logos`, admin form na upload, ukladanie do `suppliers.logo_url`.
- [ ] **Ingest run history** — tabuľka `ingest_runs` s metrikami každého behu.

## Phase 2 — pridanie zdrojov a atribútov

- [ ] **Web scraper Actor** špecifický pre B2B textil katalógy (napr. textil.cz, B2B portály) — vlastný normalizer.
- [ ] **Materiálový classifier** — z `description` a názvu kolekcií odvodiť pravdepodobné `material_type` (jednoduché keyword matching, neskôr LLM).
- [ ] **Rozsah filtrov** — gramáž (`weight_gsm` range), MOQ max, šírka.
- [ ] **Bulk import CSV** — pre dodávateľov, ktorých vlastník chce manuálne pridať.

## Phase 3 — verejný produkt

- [ ] **Účty pre značky / dizajnérov** — Supabase Auth + `profiles` tabuľka.
- [ ] **Uložené hľadania a alerty** — email keď pribudne nový dodávateľ matchujúci uložený filter.
- [ ] **Kontaktný formulár** — odošle dopyt cez Resend / Postmark na email dodávateľa, kópia do dashboardu.
- [ ] **Profil dodávateľa** — overený dodávateľ si môže nárokovať svoj profil a editovať ho (claim flow cez email z domény).
- [ ] **Hodnotenia / referencie** — od overených značiek.

## Phase 4 — škálovanie

- [ ] Rozšírenie regiónu: DE, IT, PT, TR.
- [ ] Multilingual UI (SK/EN/CZ).
- [ ] Geo-filter (PostGIS, vzdialenosť od mesta).
- [ ] Platený tier pre dodávateľov (zvýraznený listing, väčší limit kontaktov).

## Anti-roadmap *(zámerne NEROBIŤ v tomto poradí)*

- ❌ **Nesnaž sa o automatický scraping detailov látok** (gramáž, MOQ, zloženie) z webov výrobcov skôr než nemáš ručne overenú vzorku ~50 firiem. Detaily sú často v PDF / produktových katalógoch a chybný auto-scraping otrávi katalóg.
- ❌ **Nepridávaj verejnú registráciu skôr ako Phase 3** — bez kvalitných dát to nemá prečo prilákať používateľov.
- ❌ **Nerob mobile app** skôr než webová verzia má >100 aktívnych používateľov týždenne.
