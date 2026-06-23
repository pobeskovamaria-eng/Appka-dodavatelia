# Setup

## Predpoklady

- Node.js 20+
- účet na [Supabase](https://supabase.com) (free tier stačí)
- účet na [Vercel](https://vercel.com)
- účet na [Apify](https://apify.com) (free tier ~5 USD kreditov mesačne)

## 1. Supabase projekt

1. Vytvor nový projekt v Supabase dashboard.
2. **SQL Editor** → nakopíruj a spusti obsah `supabase/migrations/0001_init.sql`.
3. **Settings → API** — skopíruj:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` kľúč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` kľúč → `SUPABASE_SERVICE_ROLE_KEY` (**TAJNÝ — nikdy do klienta**)
4. **Authentication → URL Configuration** → pridaj redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<tvoja-prod-domena>/auth/callback`
5. **Authentication → Providers → Email** → povoliť *Magic Link* (default).

## 2. Lokálne spustenie

```bash
git clone <repo-url>
cd Appka-dodavatelia
cp .env.example .env.local
# vyplň hodnoty v .env.local
npm install
npm run dev
```

Otvor `http://localhost:3000`.

### Vytvorenie admin používateľa

1. V appke choď na `/admin/login`.
2. Zadaj svoj email → klikni *Poslať magic link*.
3. Skontroluj schránku, klikni odkaz → si prihlásený.
4. (Voliteľne) V Supabase **Authentication → Users** môžeš obmedziť `Email allow list` na svoju doménu.

## 3. Apify

1. Zaregistruj sa na [apify.com](https://apify.com), z `Settings → Integrations` skopíruj API token → `APIFY_TOKEN`.
2. Vygeneruj náhodný reťazec (napr. `openssl rand -hex 24`) → `APIFY_WEBHOOK_SECRET`. Tento istý reťazec dáš do webhook URL v Apify.
3. Detail Apify konfigurácie → [`INGEST.md`](./INGEST.md).

## 4. Deploy na Vercel

1. **Import Git Repository** → vyber `Appka-dodavatelia` repo.
2. **Environment Variables** — pridaj všetky kľúče z `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Sensitive)
   - `APIFY_TOKEN` (Sensitive)
   - `APIFY_WEBHOOK_SECRET` (Sensitive)
3. **Deploy**. Vercel automaticky pri každom pushi do `main` redeployne.
4. Pridaj prod URL do Supabase **Authentication → URL Configuration**:
   - `https://<projekt>.vercel.app/auth/callback`

## Environment variables — referencia

| premenná                          | scope        | popis                                                |
| --------------------------------- | ------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | client + srv | Supabase project URL                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | client + srv | anon kľúč, RLS rešpektovaný                          |
| `SUPABASE_SERVICE_ROLE_KEY`       | **server**   | service-role, obchádza RLS — len route handlers      |
| `APIFY_TOKEN`                     | **server**   | sťahovanie datasetov z Apify API                     |
| `APIFY_WEBHOOK_SECRET`            | **server**   | overenie pôvodu webhook volaní                        |

## Troubleshooting

**„Magic link mi nepríde."**
Skontroluj Supabase **Authentication → Logs**. Najčastejšia príčina: redirect URL nie je v allow list. SMTP od Supabase je rate-limitovaný na ~4/h — pre produkciu nastav vlastný SMTP v *Settings → Auth → SMTP Settings*.

**„Ingest endpoint vracia 401."**
`secret` query parameter sa nezhoduje s `APIFY_WEBHOOK_SECRET`. Skontroluj presné znenie v Apify webhook URL.

**„Niečo sa do DB nezapísalo."**
Skontroluj logy Vercel functions (`/api/ingest/apify`). Ak vidíš `duplicate key value violates unique constraint "suppliers_website_key"` — to je očakávané pri opakovaných behoch, nejde o chybu (upsert zaktualizuje existujúci riadok).
